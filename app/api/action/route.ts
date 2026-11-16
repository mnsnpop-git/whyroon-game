import { after } from "next/server";
import { ROOM_CODE_CHARS, defaultSetup } from "@/lib/constants";
import {
  type Changes,
  type Ctx,
  GameError,
  WaitError,
  cleanEmoji,
  cleanAvatar,
  cleanNickname,
  fullSetup,
  reduce,
} from "@/lib/engine";
import { broadcastDeleted, broadcastSync, getAdmin } from "@/lib/supabase/server";
import type { ActionRequest, ActionResponse, GameState, Player, Room } from "@/lib/types";

const MAX_ATTEMPTS = 8;

function json(body: Omit<ActionResponse, "serverNow">, status = 200) {
  return Response.json({ ...body, serverNow: Date.now() } satisfies ActionResponse, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

function randomCode() {
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ROOM_CODE_CHARS[n % ROOM_CODE_CHARS.length]).join("");
}

function normalizeCode(raw: unknown): string {
  if (typeof raw !== "string") throw new GameError("รหัสห้องไม่ถูกต้อง");
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) throw new GameError("รหัสห้องต้องเป็นตัวอักษร 4 ตัว");
  return code;
}

async function loadCtx(code: string, actor: string): Promise<Ctx | null> {
  const db = getAdmin();
  const [room, players, gs, gsec, psec] = await Promise.all([
    db.from("rooms").select("*").eq("code", code).maybeSingle(),
    db.from("players").select("*").eq("room_code", code).order("joined_at"),
    db.from("game_states").select("setup,state").eq("room_code", code).maybeSingle(),
    db.from("game_secrets").select("data").eq("room_code", code).maybeSingle(),
    db.from("player_secrets").select("player_id,data").eq("room_code", code),
  ]);
  const err = room.error ?? players.error ?? gs.error ?? gsec.error ?? psec.error;
  if (err) throw new Error(err.message);
  if (!room.data) return null;
  const playerSecrets: Ctx["playerSecrets"] = {};
  for (const row of psec.data ?? []) playerSecrets[row.player_id as string] = row.data;
  return {
    room: room.data as Room,
    players: (players.data ?? []) as Player[],
    setup: fullSetup(gs.data?.setup),
    state: (gs.data?.state ?? null) as GameState | null,
    gameSecret: (gsec.data?.data ?? null) as Record<string, unknown> | null,
    playerSecrets,
    actor,
    now: Date.now(),
  };
}

function toCommitPayload(c: Changes) {
  const out: Record<string, unknown> = {};
  if (c.room) out.room = c.room;
  if (c.players?.length) {
    out.players = c.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      emoji: p.emoji,
      avatar: p.avatar ?? null,
      status: p.status,
      joined_at: p.joined_at,
    }));
  }
  if ("setup" in c) out.setup = c.setup;
  if ("state" in c) out.state = c.state ?? null;
  if ("gameSecret" in c) out.gameSecret = c.gameSecret ?? null;
  if (c.clearPlayerSecrets) out.clearPlayerSecrets = true;
  if (c.playerSecrets) out.playerSecrets = c.playerSecrets;
  return out;
}

async function createRoom(actor: string, payload: Record<string, unknown>) {
  const nickname = cleanNickname(payload.nickname);
  const emoji = cleanEmoji(payload.emoji);
  const db = getAdmin();
  for (let i = 0; i < 12; i++) {
    const code = randomCode();
    const { error } = await db.from("rooms").insert({ code, host_id: actor });
    if (error) {
      if (error.code === "23505") continue; // รหัสซ้ำ สุ่มใหม่
      throw new Error(error.message);
    }
    const [p, g] = await Promise.all([
      db.from("players").insert({ room_code: code, id: actor, nickname, emoji }),
      db.from("game_states").insert({ room_code: code, setup: defaultSetup() }),
    ]);
    if (p.error || g.error) {
      await db.from("rooms").delete().eq("code", code);
      throw new Error((p.error ?? g.error)!.message);
    }
    // รูปโปรไฟล์ใส่แยก: ถ้าฐานข้อมูลยังไม่มีคอลัมน์ avatar ก็ยังสร้างห้องได้ตามปกติ
    let avatar: string | null = null;
    try {
      avatar = cleanAvatar(payload.avatar);
    } catch {
      avatar = null;
    }
    if (avatar) {
      const { error: avErr } = await db.from("players").update({ avatar }).eq("room_code", code).eq("id", actor);
      if (avErr) console.warn("[avatar] ยังไม่ได้รัน SQL เพิ่มคอลัมน์ avatar:", avErr.message);
    }
    return code;
  }
  throw new GameError("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง");
}

export async function POST(req: Request) {
  let body: ActionRequest;
  try {
    body = (await req.json()) as ActionRequest;
  } catch {
    return json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, 400);
  }

  if (body.type === "time") return json({ ok: true });

  try {
    const actor = await getUserId(req);
    if (!actor) return json({ ok: false, error: "เซสชันหมดอายุ กรุณารีเฟรชหน้า" }, 401);
    const payload = (body.payload ?? {}) as Record<string, unknown>;

    if (body.type === "room.create") {
      const code = await createRoom(actor, payload);
      return json({ ok: true, data: { code } });
    }

    const code = normalizeCode(body.code);

    if (body.type === "room.delete") {
      const ctx = await loadCtx(code, actor);
      if (!ctx) return json({ ok: false, error: `ไม่พบห้อง ${code}` }, 404);
      if (ctx.room.host_id !== actor) {
        return json({ ok: false, error: "เฉพาะหัวหน้าห้องเท่านั้นที่ลบห้องได้" }, 403);
      }
      // ข้อมูลผู้เล่น/สถานะเกม/ความลับ ถูกลบตามด้วย on delete cascade
      const { error } = await getAdmin().from("rooms").delete().eq("code", code);
      if (error) throw new Error(error.message);
      after(() => broadcastDeleted(code));
      return json({ ok: true });
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const ctx = await loadCtx(code, actor);
      if (!ctx) return json({ ok: false, error: `ไม่พบห้อง ${code}` }, 404);

      const changes = reduce(ctx, body.type, payload);
      if (!changes) return json({ ok: true, data: { noop: true } });

      const { data: version, error } = await getAdmin().rpc("commit_room", {
        p_code: code,
        p_version: ctx.room.version,
        p_changes: toCommitPayload(changes),
      });
      if (error) throw new Error(error.message);
      if (typeof version === "number" && version >= 0) {
        after(() => broadcastSync(code, version));
        return json({ ok: true, data: { version } });
      }
      // มีคนแก้สถานะไปก่อน → โหลดใหม่แล้วลองอีกครั้ง
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 60 * (attempt + 1)));
    }
    return json({ ok: false, error: "ระบบยุ่งมาก ลองกดอีกครั้งนะ" }, 409);
  } catch (e) {
    if (e instanceof WaitError) {
      return json({ ok: false, error: e.message, data: { wait: true, key: e.key } }, 409);
    }
    if (e instanceof GameError) return json({ ok: false, error: e.message }, 400);
    console.error("[action]", body.type, e);
    if (e instanceof Error && e.message.includes("rooms_game_check")) {
      // ฐานข้อมูลยังไม่รู้จักเกมใหม่ → ต้องรัน supabase/schema.sql อีกครั้ง
      return json({ ok: false, error: "ฐานข้อมูลยังไม่รองรับเกมนี้ — ให้ผู้ดูแลรัน supabase/schema.sql ใน Supabase ก่อน" }, 500);
    }
    return json({ ok: false, error: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" }, 500);
  }
}
