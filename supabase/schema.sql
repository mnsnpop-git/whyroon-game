-- =====================================================================
--  ราแรง ปาร์ตี้เกม — Supabase schema
--  วิธีใช้: เปิด Supabase Dashboard > SQL Editor > วางไฟล์นี้ทั้งไฟล์ > Run
--  (รันซ้ำได้ ไม่พัง — ทุกคำสั่งเป็นแบบ idempotent)
--
--  แนวคิดด้านความปลอดภัย:
--   * ผู้เล่น (Anonymous Auth → role "authenticated") อ่านได้อย่างเดียว
--     และอ่านได้เฉพาะห้องที่ตัวเองเป็นสมาชิก
--   * การเขียนทั้งหมดทำผ่าน API ของ Next.js (/api/action) ด้วย service role
--     ซึ่งตรวจกติกาเกมก่อน แล้ว commit แบบ atomic ผ่านฟังก์ชัน commit_room()
--   * ข้อมูลลับ (บทบาท Werewolf, คำศัพท์ของคนใบ้) อยู่ใน player_secrets
--     ซึ่งแต่ละคนอ่านได้เฉพาะแถวของตัวเอง ส่วน game_secrets ไม่มีใครอ่านได้นอกจากเซิร์ฟเวอร์
-- =====================================================================

-- ---------- Tables ----------
create table if not exists public.rooms (
  code        text primary key check (code ~ '^[A-Z]{4}$'),
  host_id     uuid not null,
  stage       text not null default 'lobby' check (stage in ('lobby', 'setup', 'playing')),
  game        text check (game in ('ohana', 'words', 'werewolf')),
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.players (
  room_code  text not null references public.rooms(code) on delete cascade,
  id         uuid not null,                       -- = auth.uid() ของผู้เล่น
  nickname   text not null check (char_length(nickname) between 1 and 20),
  emoji      text not null check (char_length(emoji) between 1 and 16),
  status     text not null default 'active' check (status in ('active', 'kicked', 'left')),
  joined_at  timestamptz not null default now(),
  primary key (room_code, id)
);
create index if not exists players_id_idx on public.players (id);

create table if not exists public.game_states (
  room_code   text primary key references public.rooms(code) on delete cascade,
  setup       jsonb not null default '{}'::jsonb,  -- ค่าตั้งค่าของทุกเกม (จำไว้ข้ามรอบ)
  state       jsonb,                               -- สถานะเกมที่กำลังเล่น (สาธารณะในห้อง)
  updated_at  timestamptz not null default now()
);

create table if not exists public.player_secrets (
  room_code  text not null references public.rooms(code) on delete cascade,
  player_id  uuid not null,
  data       jsonb not null default '{}'::jsonb,
  primary key (room_code, player_id)
);

create table if not exists public.game_secrets (
  room_code  text primary key references public.rooms(code) on delete cascade,
  data       jsonb not null default '{}'::jsonb
);

-- ---------- Helper: membership check (security definer = ไม่ติด RLS วนซ้ำ) ----------
create or replace function public.is_room_member(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where room_code = p_code and id = auth.uid()
  );
$$;

-- ---------- Row Level Security ----------
alter table public.rooms          enable row level security;
alter table public.players        enable row level security;
alter table public.game_states    enable row level security;
alter table public.player_secrets enable row level security;
alter table public.game_secrets   enable row level security;  -- ไม่มี policy = ไม่มีใครอ่านได้ (ยกเว้น service role)

drop policy if exists "members read room" on public.rooms;
create policy "members read room" on public.rooms
  for select to authenticated
  using (public.is_room_member(code));

drop policy if exists "members read players" on public.players;
create policy "members read players" on public.players
  for select to authenticated
  using (public.is_room_member(room_code));

drop policy if exists "members read game state" on public.game_states;
create policy "members read game state" on public.game_states
  for select to authenticated
  using (public.is_room_member(room_code));

drop policy if exists "read own secret" on public.player_secrets;
create policy "read own secret" on public.player_secrets
  for select to authenticated
  using (player_id = auth.uid());

-- ไม่มี insert/update/delete policy สำหรับ client → เขียนได้ผ่านเซิร์ฟเวอร์เท่านั้น
revoke insert, update, delete on public.rooms, public.players, public.game_states,
  public.player_secrets, public.game_secrets from anon, authenticated;

-- ---------- Snapshot: อ่านทุกอย่างของห้องในครั้งเดียว (consistent) ----------
create or replace function public.get_snapshot(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_room_member(p_code) then
    return null;
  end if;

  return jsonb_build_object(
    'room', (select to_jsonb(r) from public.rooms r where r.code = p_code),
    'players', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.joined_at)
      from public.players p where p.room_code = p_code
    ), '[]'::jsonb),
    'setup', (select g.setup from public.game_states g where g.room_code = p_code),
    'state', (select g.state from public.game_states g where g.room_code = p_code),
    'secret', (select s.data from public.player_secrets s
               where s.room_code = p_code and s.player_id = v_uid),
    'now', floor(extract(epoch from clock_timestamp()) * 1000)
  );
end;
$$;

revoke all on function public.get_snapshot(text) from public, anon;
grant execute on function public.get_snapshot(text) to authenticated;

-- ---------- Commit: เขียนการเปลี่ยนแปลงทั้งหมดแบบ atomic + optimistic lock ----------
-- p_changes keys (ใส่เฉพาะที่เปลี่ยน):
--   room:            { host_id?, stage?, game? }    (game: null = ล้าง)
--   players:         [ {id, nickname, emoji, status, joined_at?}, ... ]  (upsert)
--   setup:           jsonb
--   state:           jsonb | null
--   gameSecret:      jsonb | null
--   clearPlayerSecrets: true   (ลบความลับของทุกคนในห้องก่อน)
--   playerSecrets:   { "<uuid>": jsonb | null, ... }  (null = ลบ)
-- คืนค่า version ใหม่ หรือ -1 ถ้ามีคนอื่นแก้ไปก่อน (ฝั่งเซิร์ฟเวอร์จะ retry)
create or replace function public.commit_room(p_code text, p_version integer, p_changes jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
  v_room jsonb := p_changes -> 'room';
  v_p jsonb;
  v_key text;
  v_val jsonb;
begin
  update public.rooms
     set version    = version + 1,
         updated_at = now(),
         host_id = case when v_room ? 'host_id' then (v_room ->> 'host_id')::uuid else host_id end,
         stage   = case when v_room ? 'stage'   then v_room ->> 'stage'           else stage end,
         game    = case when v_room ? 'game'    then v_room ->> 'game'            else game end
   where code = p_code and version = p_version
  returning version into v_new;

  if v_new is null then
    return -1;
  end if;

  if p_changes ? 'players' then
    for v_p in select * from jsonb_array_elements(p_changes -> 'players') loop
      insert into public.players (room_code, id, nickname, emoji, status, joined_at)
      values (
        p_code,
        (v_p ->> 'id')::uuid,
        v_p ->> 'nickname',
        v_p ->> 'emoji',
        coalesce(v_p ->> 'status', 'active'),
        coalesce((v_p ->> 'joined_at')::timestamptz, now())
      )
      on conflict (room_code, id) do update
        set nickname = excluded.nickname,
            emoji    = excluded.emoji,
            status   = excluded.status,
            joined_at = excluded.joined_at;
    end loop;
  end if;

  if p_changes ? 'setup' or p_changes ? 'state' then
    insert into public.game_states (room_code, setup, state, updated_at)
    values (
      p_code,
      coalesce(p_changes -> 'setup', '{}'::jsonb),
      case when jsonb_typeof(p_changes -> 'state') = 'null' then null else p_changes -> 'state' end,
      now()
    )
    on conflict (room_code) do update
      set setup = case when p_changes ? 'setup' then excluded.setup else public.game_states.setup end,
          state = case when p_changes ? 'state' then excluded.state else public.game_states.state end,
          updated_at = now();
  end if;

  if p_changes ? 'gameSecret' then
    if jsonb_typeof(p_changes -> 'gameSecret') = 'null' then
      delete from public.game_secrets where room_code = p_code;
    else
      insert into public.game_secrets (room_code, data)
      values (p_code, p_changes -> 'gameSecret')
      on conflict (room_code) do update set data = excluded.data;
    end if;
  end if;

  if coalesce((p_changes ->> 'clearPlayerSecrets')::boolean, false) then
    delete from public.player_secrets where room_code = p_code;
  end if;

  if p_changes ? 'playerSecrets' then
    for v_key, v_val in select * from jsonb_each(p_changes -> 'playerSecrets') loop
      if jsonb_typeof(v_val) = 'null' then
        delete from public.player_secrets where room_code = p_code and player_id = v_key::uuid;
      else
        insert into public.player_secrets (room_code, player_id, data)
        values (p_code, v_key::uuid, v_val)
        on conflict (room_code, player_id) do update set data = excluded.data;
      end if;
    end loop;
  end if;

  return v_new;
end;
$$;

revoke all on function public.commit_room(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.commit_room(text, integer, jsonb) to service_role;

-- ---------- Cleanup: ลบห้องที่ไม่มีความเคลื่อนไหวเกิน 2 วัน ----------
create or replace function public.cleanup_old_rooms()
returns integer
language sql
security definer
set search_path = public
as $$
  with d as (
    delete from public.rooms where updated_at < now() - interval '2 days' returning 1
  )
  select count(*)::integer from d;
$$;
revoke all on function public.cleanup_old_rooms() from public, anon, authenticated;
grant execute on function public.cleanup_old_rooms() to service_role;

-- ---------- Realtime ----------
-- ทุกการ commit จะอัปเดตแถวใน rooms (version + 1) → client ฟังแค่ตารางนี้แล้วดึง snapshot ใหม่
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;
