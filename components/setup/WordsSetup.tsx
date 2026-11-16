"use client";

import { Clock, Tag, Users } from "lucide-react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import type { WordsSetup } from "@/lib/types";
import { WORD_CATEGORIES, WORD_SCOPES, isScopedCategory } from "@/lib/words-data";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section } from "../ui/Section";
import { PlayerOrderEditor } from "./PlayerOrderEditor";
import { TeamEditor } from "./TeamEditor";

const TIMES: { v: WordsSetup["seconds"]; label: string }[] = [
  { v: 60, label: "1 นาที" },
  { v: 180, label: "3 นาที" },
  { v: 300, label: "5 นาที" },
  { v: 600, label: "10 นาที" },
];

export function WordsSetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("words");
  const editable = room.isHost;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const set = (patch: Partial<WordsSetup>) => update({ ...draft, ...patch });

  return (
    <>
      <Section title="รูปแบบการเล่น" icon={<Users size={20} className="text-pink" />}>
        <div className="grid grid-cols-2 gap-3">
          <Chip active={draft.mode === "team"} disabled={!editable} onClick={() => set({ mode: "team" })}>
            👥 แบ่งทีม
          </Chip>
          <Chip active={draft.mode === "solo"} disabled={!editable} onClick={() => set({ mode: "solo" })}>
            🙋 เล่นเดี่ยว
          </Chip>
        </div>
      </Section>

      <Section title="หมวดคำศัพท์" icon={<Tag size={20} className="text-sun" />}>
        <div className="grid grid-cols-2 gap-2">
          {WORD_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={draft.category === c.id}
              disabled={!editable}
              onClick={() => set({ category: c.id })}
            >
              <span className="mr-1">{c.emoji}</span>
              {c.name}
            </Chip>
          ))}
        </div>
        {isScopedCategory(draft.category) && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.04] p-3">
            <div className="mb-2 text-sm font-semibold text-muted">ขอบเขตคำ</div>
            <div className="grid grid-cols-2 gap-2">
              {WORD_SCOPES.map((sc) => (
                <Chip
                  key={sc.id}
                  active={(draft.scope ?? "global") === sc.id}
                  disabled={!editable}
                  onClick={() => set({ scope: sc.id })}
                >
                  <span className="mr-1">{sc.emoji}</span>
                  {sc.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="เวลาต่อรอบ" icon={<Clock size={20} className="text-mint" />}>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map((t) => (
            <Chip key={t.v} active={draft.seconds === t.v} disabled={!editable} onClick={() => set({ seconds: t.v })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Section>

      {draft.mode === "solo" ? (
        <Section title="ลำดับคนใบ้" icon={<span>🙋</span>}>
          <PlayerOrderEditor
            order={draft.soloOrder}
            editable={editable}
            onChange={(soloOrder) => set({ soloOrder })}
          />
        </Section>
      ) : (
        <TeamEditor
          teams={draft.teams}
          serverTeams={room.setup.words.teams}
          editable={editable}
          onChange={(teams) => set({ teams })}
        />
      )}
    </>
  );
}
