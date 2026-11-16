"use client";

import { useState } from "react";
import { EMOJI_GROUPS } from "@/lib/constants";

/** เลือกอิโมจิแบบแบ่งหมวด (แท็บเลื่อนแนวนอน) — เปิดมาที่หมวดของอิโมจิที่เลือกอยู่ */
export function EmojiPicker({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}) {
  const [group, setGroup] = useState(
    () => EMOJI_GROUPS.find((g) => g.emojis.includes(value))?.id ?? EMOJI_GROUPS[0].id,
  );
  const current = EMOJI_GROUPS.find((g) => g.id === group) ?? EMOJI_GROUPS[0];

  return (
    <div className={className}>
      <div role="tablist" aria-label="หมวดอิโมจิ" className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {EMOJI_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === group}
            onClick={() => setGroup(g.id)}
            className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              g.id === group
                ? "border-sky/60 bg-sky/20 text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <span className="text-base leading-none">{g.icon}</span> {g.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto pr-1">
        {current.emojis.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`เลือก ${e}`}
            aria-pressed={e === value}
            onClick={() => onChange(e)}
            className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition ${
              e === value ? "scale-110 bg-sky/25 ring-2 ring-sky" : "bg-white/5 hover:bg-white/10 active:scale-90"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
