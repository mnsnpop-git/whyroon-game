"use client";

import { Clock, Hash, ListOrdered, Users } from "lucide-react";
import { useEffect } from "react";
import { FILL_WORDS } from "@/lib/fill-words";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import type { FillSetup } from "@/lib/types";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section } from "../ui/Section";
import { PlayerOrderEditor } from "./PlayerOrderEditor";
import { TeamEditor } from "./TeamEditor";

const QUESTIONS: FillSetup["questions"][] = [5, 10, 15];
const SECONDS: FillSetup["seconds"][] = [15, 30, 45, 60];

export function FillSetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("fill");
  const editable = room.isHost;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const set = (patch: Partial<FillSetup>) => update({ ...draft, ...patch });

  return (
    <>
      <Section title="วิธีเล่น" icon={<span>🧩</span>}>
        <ol className="flex flex-col gap-1.5 text-sm text-white/75">
          <li>1️⃣ ทุกข้อจะโชว์คำที่ซ่อนตัวอักษรไว้ครึ่งหนึ่ง เช่น ข _ ว ม _ น _ ไ _</li>
          <li>2️⃣ ใครพิมพ์คำตอบถูกเป๊ะเป็น &quot;คนแรก&quot; ได้ +1 ทันที ข้อนั้นล็อกเลย</li>
          <li>3️⃣ หมดเวลาไม่มีใครตอบถูก → เฉลยแล้วไปข้อถัดไป ไม่มีใครได้แต้ม</li>
          <li>🍻 จบเกม คนหรือทีมที่คะแนนน้อยสุดดื่ม 1 แก้ว!</li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          คลังคำ: {FILL_WORDS.map((c) => c.category).join(" · ")}
        </p>
      </Section>

      <Section title="โหมด" icon={<Users size={20} className="text-sky" />}>
        <div className="grid grid-cols-2 gap-3">
          <Chip active={draft.mode === "solo"} disabled={!editable} onClick={() => set({ mode: "solo" })}>
            🙋 เดี่ยว
          </Chip>
          <Chip active={draft.mode === "team"} disabled={!editable} onClick={() => set({ mode: "team" })}>
            👥 ทีม
          </Chip>
        </div>
      </Section>

      <Section title="จำนวนข้อ" icon={<Hash size={20} className="text-pink" />}>
        <div className="grid grid-cols-3 gap-2">
          {QUESTIONS.map((q) => (
            <Chip key={q} active={draft.questions === q} disabled={!editable} onClick={() => set({ questions: q })}>
              {q} ข้อ
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="เวลาต่อข้อ" icon={<Clock size={20} className="text-mint" />}>
        <div className="grid grid-cols-4 gap-2">
          {SECONDS.map((s) => (
            <Chip key={s} active={draft.seconds === s} disabled={!editable} onClick={() => set({ seconds: s })}>
              {s} วิ
            </Chip>
          ))}
        </div>
      </Section>

      {draft.mode === "solo" ? (
        <Section title="ผู้เล่น" icon={<ListOrdered size={20} className="text-sun" />}>
          <PlayerOrderEditor
            order={draft.participants}
            editable={editable}
            onChange={(participants) => set({ participants })}
          />
        </Section>
      ) : (
        <TeamEditor
          teams={draft.teams}
          serverTeams={room.setup.fill.teams}
          editable={editable}
          onChange={(teams) => set({ teams })}
        />
      )}
    </>
  );
}
