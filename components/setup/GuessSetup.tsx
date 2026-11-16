"use client";

import { Clock, ListOrdered, Repeat, Trophy } from "lucide-react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import type { GuessSetup } from "@/lib/types";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section } from "../ui/Section";
import { PlayerOrderEditor } from "./PlayerOrderEditor";

const SECONDS: GuessSetup["seconds"][] = [30, 60, 90, 120];
const LAPS: GuessSetup["laps"][] = [1, 2, 3];

export function GuessSetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("guess");
  const editable = room.isHost;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const set = (patch: Partial<GuessSetup>) => update({ ...draft, ...patch });
  const players = draft.participants.filter((id) => room.players.some((p) => p.id === id)).length;
  const turns = players * draft.laps;

  return (
    <>
      <Section title="วิธีเล่น" icon={<span>🤫</span>}>
        <ol className="flex flex-col gap-1.5 text-sm text-white/75">
          <li>1️⃣ คนใบ้ตั้ง &quot;คำลับ&quot; (พิมพ์เอง หรือกดสุ่ม) — คนอื่นมองไม่เห็น</li>
          <li>2️⃣ กดเริ่มจับเวลา แล้วใบ้ด้วยท่าทาง/คำพูด เพื่อนตะโกนหรือพิมพ์ตอบ</li>
          <li>3️⃣ พิมพ์ตรงเป๊ะชนะทันที หรือให้คนใบ้จิ้มเลือกคนที่ตอบถูกคนแรก</li>
          <li>🍻 จบเกม คนที่ทายถูกน้อยที่สุดโดนดื่ม 1 แก้ว!</li>
        </ol>
      </Section>

      <Section title="ลำดับคนใบ้" icon={<ListOrdered size={20} className="text-pink" />}>
        <PlayerOrderEditor
          order={draft.participants}
          editable={editable}
          onChange={(participants) => set({ participants })}
        />
      </Section>

      <Section title="เวลาต่อรอบ" icon={<Clock size={20} className="text-mint" />}>
        <div className="grid grid-cols-4 gap-2">
          {SECONDS.map((s) => (
            <Chip key={s} active={draft.seconds === s} disabled={!editable} onClick={() => set({ seconds: s })}>
              {s} วิ
            </Chip>
          ))}
        </div>
      </Section>

      <Section
        title="จำนวนรอบ"
        icon={<Repeat size={20} className="text-sky" />}
        right={<span className="text-xs text-muted">รวม {turns} ตา</span>}
      >
        <div className="grid grid-cols-3 gap-2">
          {LAPS.map((l) => (
            <Chip key={l} active={draft.laps === l} disabled={!editable} onClick={() => set({ laps: l })}>
              ใบ้คนละ {l} รอบ
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="การให้คะแนน" icon={<Trophy size={20} className="text-sun" />}>
        <div className="grid grid-cols-2 gap-2">
          <Chip active={draft.giverPoint !== false} disabled={!editable} onClick={() => set({ giverPoint: true })}>
            คนทาย +1 · คนใบ้ +1
          </Chip>
          <Chip active={draft.giverPoint === false} disabled={!editable} onClick={() => set({ giverPoint: false })}>
            นับเฉพาะคนทาย
          </Chip>
        </div>
      </Section>
    </>
  );
}
