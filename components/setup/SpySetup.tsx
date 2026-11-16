"use client";

import { Clock, ListOrdered, VenetianMask } from "lucide-react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import { SPY_MIN_PLAYERS, clampSpies, maxSpies } from "@/lib/engine/spy";
import { SPY_LOCATIONS } from "@/lib/spy-locations";
import type { SpySetup } from "@/lib/types";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section, Stepper } from "../ui/Section";
import { PlayerOrderEditor } from "./PlayerOrderEditor";

const MINUTES: SpySetup["minutes"][] = [3, 5, 8, 10];

export function SpySetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("spy");
  const editable = room.isHost;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const set = (patch: Partial<SpySetup>) => update({ ...draft, ...patch });
  const players = draft.participants.filter((id) => room.player(id)?.status === "active").length;
  const max = maxSpies(players);
  const spies = clampSpies(draft.spies, players);

  return (
    <>
      <Section title="วิธีเล่น" icon={<span>🕵️</span>}>
        <ol className="flex flex-col gap-1.5 text-sm text-white/75">
          <li>1️⃣ ทุกคนได้รู้ &quot;สถานที่ลับ&quot; และบทบาทของตัวเอง — ยกเว้นสายลับ</li>
          <li>2️⃣ ผลัดกันถาม-ตอบ ตอบให้คนในทีมรู้ว่าเรารู้ แต่อย่าให้สายลับเดาออก</li>
          <li>3️⃣ สงสัยใคร กด &quot;จับผิดสายลับ!&quot; แล้วทุกคนโหวต (เกินครึ่ง = จับตัว)</li>
          <li>4️⃣ สายลับกด &quot;ทายสถานที่&quot; ได้ตลอด — ทายถูกชนะทันที ทายผิดแพ้ทันที</li>
          <li>⏰ หมดเวลาโดยไม่มีใครจับได้ = สายลับชนะ · 🍻 ฝั่งที่แพ้ดื่ม 1 แก้ว</li>
        </ol>
        <p className="mt-3 text-xs text-muted">มีสถานที่ลับให้สุ่ม {SPY_LOCATIONS.length} แห่ง</p>
      </Section>

      <Section
        title="ผู้เล่น"
        icon={<ListOrdered size={20} className="text-pink" />}
        right={<span className="text-xs text-muted">{players} คน</span>}
      >
        <PlayerOrderEditor
          order={draft.participants}
          editable={editable}
          onChange={(participants) => set({ participants, spies: clampSpies(draft.spies, participants.length) })}
        />
        {players < SPY_MIN_PLAYERS && (
          <p className="mt-3 text-center text-sm font-semibold text-coral">ต้องมีผู้เล่นอย่างน้อย {SPY_MIN_PLAYERS} คน</p>
        )}
      </Section>

      <Section title="เวลาต่อรอบ" icon={<Clock size={20} className="text-mint" />}>
        <div className="grid grid-cols-4 gap-2">
          {MINUTES.map((m) => (
            <Chip key={m} active={draft.minutes === m} disabled={!editable} onClick={() => set({ minutes: m })}>
              {m} นาที
            </Chip>
          ))}
        </div>
      </Section>

      <Section
        title="จำนวนสายลับ"
        icon={<VenetianMask size={20} className="text-violet" />}
        right={
          editable ? (
            <Stepper value={spies} min={1} max={max} onChange={(n) => set({ spies: clampSpies(n, players) })} />
          ) : (
            <span className="text-xl font-extrabold">{spies}</span>
          )
        }
      >
        <p className="text-sm text-muted">
          ผู้เล่น {players} คน เลือกสายลับได้ 1–{max} คน (ต้องน้อยกว่าคนทั่วไปเสมอ) · สายลับแต่ละคนจะไม่รู้ว่าใครเป็นสายลับอีกคน
        </p>
      </Section>
    </>
  );
}
