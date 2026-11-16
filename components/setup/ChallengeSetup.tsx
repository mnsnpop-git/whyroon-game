"use client";

import { Layers, ListOrdered, Timer } from "lucide-react";
import { useEffect } from "react";
import { CHALLENGE_CARDS, FORBIDDEN_CARDS } from "@/lib/challenge-cards";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import type { ChallengeSetup } from "@/lib/types";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section } from "../ui/Section";
import { PlayerOrderEditor } from "./PlayerOrderEditor";

export function ChallengeSetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("challenge");
  const editable = room.isHost;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const set = (patch: Partial<ChallengeSetup>) => update({ ...draft, ...patch });

  return (
    <>
      <Section title="วิธีเล่น" icon={<Layers size={20} className="text-coral" />}>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3">
            <div className="text-3xl">🎯</div>
            <div className="mt-1 font-bold text-emerald-200">การ์ดคำสั่ง</div>
            <div className="text-xs text-white/60">{CHALLENGE_CARDS.length} ใบ · ภารกิจของคนจั่ว</div>
          </div>
          <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3">
            <div className="text-3xl">🚫</div>
            <div className="mt-1 font-bold text-rose-200">การ์ดห้าม</div>
            <div className="text-xs text-white/60">{FORBIDDEN_CARDS.length} ใบ · กฎสำหรับทุกคน</div>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-white/75">
          <li>🃏 ถึงตาใคร กดสุ่มจั่ว — จะได้การ์ดคำสั่งหรือการ์ดห้ามก็ลุ้นเอา!</li>
          <li>💪 ได้การ์ดคำสั่ง เลือก &quot;รับคำท้า&quot; หรือ &quot;ยอมดื่ม&quot; (นับเป็นทำพลาด +1)</li>
          <li>📌 การ์ดใบล่าสุดมีผลไปเรื่อยๆ จนกว่าจะมีคนจั่วใบใหม่มาแทน</li>
          <li>🍺 ใครทำพลาด เพื่อนกด &quot;ทำพลาด!&quot; → ดื่ม 1 แก้ว ระบบนับสถิติให้</li>
        </ul>
      </Section>

      <Section title="ลำดับคิวจั่วการ์ด" icon={<ListOrdered size={20} className="text-pink" />}>
        <PlayerOrderEditor
          order={draft.participants}
          editable={editable}
          onChange={(participants) => set({ participants })}
        />
      </Section>

      <Section title="นับถอยหลังการ์ดคำสั่ง" icon={<Timer size={20} className="text-sky" />}>
        <div className="grid grid-cols-2 gap-3">
          <Chip active={draft.timers !== false} disabled={!editable} onClick={() => set({ timers: true })}>
            ⏱️ เปิด
          </Chip>
          <Chip active={draft.timers === false} disabled={!editable} onClick={() => set({ timers: false })}>
            ✋ ปิด
          </Chip>
        </div>
        <p className="mt-3 text-sm text-muted">การ์ดคำสั่งบางใบมีเวลาจำกัด (เช่น 15 วินาที) เริ่มนับถอยหลังบนจอทุกคนเมื่อกดรับคำท้า</p>
      </Section>
    </>
  );
}
