"use client";

import { Clock, Users } from "lucide-react";
import { useEffect } from "react";
import { ROLE_INFO } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import type { WerewolfSetup } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section, Stepper } from "../ui/Section";

const DISCUSS = [60, 120, 180, 300];
const NIGHT = [20, 30, 45, 60];
const VOTE = [30, 60, 90];

export function WerewolfSetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("werewolf");
  const editable = room.isHost;
  const n = room.players.length;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const r = draft.roles;
  const specials = r.werewolf + r.seer + r.doctor + r.hunter;
  const villagers = n - specials;
  const setRoles = (patch: Partial<WerewolfSetup["roles"]>) =>
    update({ ...draft, roles: { ...r, ...patch } });

  let problem: string | null = null;
  if (n < 4) problem = `ต้องมีผู้เล่นอย่างน้อย 4 คน (ตอนนี้ ${n} คน)`;
  else if (r.werewolf * 2 >= n) problem = "หมาป่าเยอะเกินไป ต้องน้อยกว่าครึ่งหนึ่งของผู้เล่น";
  else if (villagers < 0) problem = "บทบาทพิเศษมากกว่าจำนวนผู้เล่น";

  const recommended = Math.max(1, Math.floor(n / 4));

  return (
    <>
      <Section title={`ผู้เล่นทั้งหมด ${n} คน`} icon={<Users size={20} className="text-pink" />}>
        <div className="flex flex-wrap gap-2">
          {room.players.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 rounded-xl bg-panel2 py-1 pl-1 pr-2.5">
              <Avatar player={p} size="sm" />
              <span className="text-sm font-semibold">{p.nickname}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="บทบาทในเกม">
        <div className="flex flex-col gap-2">
          <RoleRow role="werewolf" hint={`แนะนำ ${recommended} ตัว`}>
            <Stepper
              value={r.werewolf}
              min={1}
              max={Math.max(1, Math.ceil(n / 2) - 1)}
              disabled={!editable}
              onChange={(v) => setRoles({ werewolf: v })}
            />
          </RoleRow>
          {(["seer", "doctor", "hunter"] as const).map((role) => (
            <RoleRow key={role} role={role}>
              <Toggle
                on={r[role] > 0}
                disabled={!editable}
                onChange={(on) => setRoles({ [role]: on ? 1 : 0 })}
              />
            </RoleRow>
          ))}
          <RoleRow role="villager" hint="คำนวณอัตโนมัติ">
            <span className="w-24 text-center text-2xl font-bold tabular-nums">{Math.max(0, villagers)}</span>
          </RoleRow>
        </div>
        {problem && (
          <p className="mt-3 rounded-2xl bg-coral/20 p-3 text-center font-semibold text-coral">⚠️ {problem}</p>
        )}
      </Section>

      <Section title="เวลาแต่ละช่วง" icon={<Clock size={20} className="text-sun" />}>
        <TimeRow
          label="☀️ ช่วงถกเถียง"
          options={DISCUSS}
          value={draft.discussSeconds}
          editable={editable}
          format={(s) => `${s / 60} นาที`}
          onChange={(v) => update({ ...draft, discussSeconds: v })}
        />
        <TimeRow
          label="🌙 แต่ละบทบาทตอนกลางคืน"
          options={NIGHT}
          value={draft.nightSeconds}
          editable={editable}
          format={(s) => `${s} วิ`}
          onChange={(v) => update({ ...draft, nightSeconds: v })}
        />
        <TimeRow
          label="⚖️ ช่วงโหวต"
          options={VOTE}
          value={draft.voteSeconds}
          editable={editable}
          format={(s) => `${s} วิ`}
          onChange={(v) => update({ ...draft, voteSeconds: v })}
        />
      </Section>
    </>
  );
}

function RoleRow({
  role,
  hint,
  children,
}: {
  role: keyof typeof ROLE_INFO;
  hint?: string;
  children: React.ReactNode;
}) {
  const info = ROLE_INFO[role];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel2 p-3">
      <span className="text-4xl">{info.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-bold" style={{ color: info.color }}>
          {info.name}
        </div>
        <div className="text-xs leading-snug text-muted">{hint ?? info.desc}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`btn-3d relative h-9 w-16 shrink-0 rounded-full ${on ? "bg-mint" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full bg-white transition-all ${on ? "left-8" : "left-0.5"}`}
      />
    </button>
  );
}

function TimeRow({
  label,
  options,
  value,
  editable,
  format,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  editable: boolean;
  format: (s: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-2 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} active={value === o} disabled={!editable} onClick={() => onChange(o)}>
            {format(o)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
