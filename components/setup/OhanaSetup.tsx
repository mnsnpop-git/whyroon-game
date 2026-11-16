"use client";

import { Dices, Layers, ListOrdered, Crown } from "lucide-react";
import { useEffect } from "react";
import { K_RULE_SUGGESTIONS } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import { useSetupDraft } from "@/lib/client/use-setup-draft";
import type { OhanaSetup } from "@/lib/types";
import type { FlushRef } from "../room/SetupScreen";
import { Chip, Section } from "../ui/Section";
import { PlayerOrderEditor } from "./PlayerOrderEditor";

export function OhanaSetupPanel({ flushRef }: { flushRef: FlushRef }) {
  const room = useRoom();
  const { draft, update, flush } = useSetupDraft("ohana");
  const editable = room.isHost;

  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);

  const set = (patch: Partial<OhanaSetup>) => update({ ...draft, ...patch });

  const randomRule = (i: number) => {
    const pool = K_RULE_SUGGESTIONS.filter((r) => !draft.kRules.includes(r));
    const rule = pool[Math.floor(Math.random() * pool.length)] ?? K_RULE_SUGGESTIONS[0];
    const kRules = draft.kRules.slice() as OhanaSetup["kRules"];
    kRules[i] = rule;
    set({ kRules });
  };

  return (
    <>
      <Section title="ลำดับคิวผู้เล่น" icon={<ListOrdered size={20} className="text-pink" />}>
        <PlayerOrderEditor
          order={draft.participants}
          editable={editable}
          onChange={(participants) => set({ participants })}
        />
      </Section>

      <Section title="กติกาไพ่ K ทั้ง 4 ใบ" icon={<Crown size={20} className="text-sun" />}>
        <div className="flex flex-col gap-3">
          {draft.kRules.map((rule, i) => (
            <div key={i}>
              <label className="mb-1 block text-sm font-bold text-sun" htmlFor={`k${i}`}>
                👑 K ใบที่ {i + 1}
              </label>
              <div className="flex gap-2">
                <textarea
                  id={`k${i}`}
                  value={rule}
                  rows={2}
                  maxLength={140}
                  disabled={!editable}
                  placeholder="พิมพ์กติกา..."
                  onChange={(e) => {
                    const kRules = draft.kRules.slice() as OhanaSetup["kRules"];
                    kRules[i] = e.target.value;
                    set({ kRules });
                  }}
                  className="min-w-0 flex-1 resize-none rounded-2xl px-3 py-2 text-base font-medium border border-white/15 bg-black/30 text-white placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20 disabled:bg-white/5 disabled:text-white/70"
                />
                {editable && (
                  <button
                    type="button"
                    aria-label={`สุ่มกติกา K ใบที่ ${i + 1}`}
                    onClick={() => randomRule(i)}
                    className="btn-3d flex w-12 shrink-0 items-center justify-center rounded-2xl bg-sun text-ink"
                  >
                    <Dices />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="จำนวนสำรับไพ่" icon={<Layers size={20} className="text-mint" />}>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map((d) => (
            <Chip key={d} active={draft.decks === d} disabled={!editable} onClick={() => set({ decks: d })}>
              <span className="block text-xl">{d} สำรับ</span>
              <span className="block text-sm opacity-80">{d * 52} ใบ</span>
            </Chip>
          ))}
        </div>
      </Section>
    </>
  );
}
