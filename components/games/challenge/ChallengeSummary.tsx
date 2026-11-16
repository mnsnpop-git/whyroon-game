"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { DECK_INFO } from "@/lib/challenge-cards";
import { useRoom } from "@/lib/client/room-store";
import type { ChallengeState } from "@/lib/types";
import { Button } from "../../ui/Button";

const MEDALS = ["🥇", "🥈", "🥉"];

export function ChallengeSummary({ state }: { state: ChallengeState }) {
  const room = useRoom();
  const caused = state.caused ?? {};
  const ids = Array.from(new Set([...state.order, ...Object.keys(state.fails), ...Object.keys(caused)]));
  const ranked = rank(ids, state.fails);
  const rankedCaused = rank(ids, caused);
  const totalFails = ranked.reduce((sum, r) => sum + r.n, 0);
  const top = ranked[0]?.n ?? 0;
  const champs = top > 0 ? ranked.filter((r) => r.n === top) : [];
  const topCaused = rankedCaused[0]?.n ?? 0;
  const villains = topCaused > 0 ? rankedCaused.filter((r) => r.n === topCaused) : [];
  const failByDeck = {
    challenge: state.failLog.filter((f) => f.deck === "challenge").length,
    forbidden: state.failLog.filter((f) => f.deck === "forbidden").length,
  };
  // การ์ดที่ทำให้คนพลาดมากที่สุด (จาก log ล่าสุด)
  const byCard = new Map<string, number>();
  for (const f of state.failLog) if (f.text) byCard.set(f.text, (byCard.get(f.text) ?? 0) + 1);
  const killer = [...byCard.entries()].sort((a, b) => b[1] - a[1])[0];

  useEffect(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.45 } });
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-6">
      <div className="text-center">
        <div className="text-6xl">🏁</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">สรุปผล ท้าทาย &amp; ห้าม</h1>
        {champs.length === 0 && <p className="mt-2 text-muted">ไม่มีใครทำพลาดเลย เก่งกันจัง 😇</p>}
      </div>

      {(champs.length > 0 || villains.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Award
            className="tint-rose"
            title="😵 พลาดมากที่สุด"
            names={champs.map((c) => c.id)}
            value={top > 0 ? `${top} ครั้ง · ดื่ม ${top} แก้ว` : "ไม่มี"}
          />
          <Award
            className="tint-sky"
            title="😈 ทำให้คนอื่นพลาดมากที่สุด"
            names={villains.map((c) => c.id)}
            value={topCaused > 0 ? `${topCaused} ครั้ง` : "ไม่มี"}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "การ์ดที่จั่ว", value: state.drawn },
          { label: "ทำพลาดรวม", value: totalFails },
          { label: "สลับสำรับ", value: state.shuffles },
        ].map((x) => (
          <div key={x.label} className="card-3d rounded-2xl bg-panel p-4">
            <div className="text-3xl font-extrabold tabular-nums text-sky">{x.value}</div>
            <div className="mt-1 text-xs text-muted">{x.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["challenge", "forbidden"] as const).map((d) => (
          <div key={d} className="card-3d rounded-2xl bg-panel p-4">
            <div className="text-sm font-bold">
              {DECK_INFO[d].emoji} {DECK_INFO[d].name}
            </div>
            <div className="mt-1 text-xs text-muted">
              จั่ว {state.drawnBy[d]} ใบ · พลาด {failByDeck[d]} ครั้ง
            </div>
          </div>
        ))}
      </div>

      <Board title="😵 อันดับคนที่พลาดมากที่สุด" hint="1 ครั้ง = 1 แก้ว" rows={ranked} unit="แก้ว" color="text-sun" />
      <Board
        title="😈 อันดับคนที่ทำให้คนอื่นพลาดมากที่สุด"
        hint="นับจากการ์ดที่ตัวเองจั่ว (ไม่นับพลาดการ์ดตัวเอง)"
        rows={rankedCaused}
        unit="ครั้ง"
        color="text-sky"
      />

      {killer && killer[1] > 1 && (
        <div className="tint-rose card-3d rounded-3xl p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">การ์ดโหดที่สุด</div>
          <div className="mt-1 text-lg font-bold">“{killer[0]}”</div>
          <div className="text-sm opacity-80">ทำให้พลาด {killer[1]} ครั้ง</div>
        </div>
      )}

      {room.isHost ? (
        <div className="flex flex-col gap-3">
          <Button tone="mint" size="lg" onClick={() => room.dispatch("challenge.resume")}>
            ▶️ กลับไปเล่นต่อ (เก็บสถิติไว้)
          </Button>
          <Button tone="sky" size="lg" onClick={() => room.dispatch("challenge.newGame")}>
            🔄 เริ่มเกมใหม่ (สลับสำรับ + ล้างสถิติ)
          </Button>
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("game.end")}>
            ⚙️ กลับไปหน้าตั้งค่า
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted">รอหัวหน้าห้องเลือกว่าจะเล่นต่อหรือไม่...</p>
      )}
    </main>
  );
}

function rank(ids: string[], counts: Record<string, number>) {
  return ids.map((id) => ({ id, n: counts[id] ?? 0 })).sort((a, b) => b.n - a.n);
}

function Award({ title, names, value, className }: { title: string; names: string[]; value: string; className: string }) {
  const room = useRoom();
  return (
    <div className={`card-3d flex flex-col rounded-3xl p-4 text-center ${className}`}>
      <div className="text-xs font-semibold opacity-80">{title}</div>
      <div className="mt-2 flex flex-1 flex-col justify-center gap-1">
        {names.length === 0 ? (
          <div className="text-lg font-bold opacity-60">—</div>
        ) : (
          names.map((id) => (
            <div key={id} className="truncate text-lg font-extrabold">
              {room.player(id)?.emoji} {room.player(id)?.nickname ?? "?"}
            </div>
          ))
        )}
      </div>
      <div className="mt-1 text-xs font-semibold opacity-80">{value}</div>
    </div>
  );
}

function Board({
  title,
  hint,
  rows,
  unit,
  color,
}: {
  title: string;
  hint: string;
  rows: { id: string; n: number }[];
  unit: string;
  color: string;
}) {
  const room = useRoom();
  const rankOf = (n: number) => rows.findIndex((r) => r.n === n) + 1;
  return (
    <section className="card-3d rounded-3xl bg-panel p-4">
      <h2 className="text-sm font-bold text-white/85">{title}</h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const p = room.player(r.id);
          const rk = rankOf(r.n);
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5"
            >
              <span className="w-8 text-center text-lg font-extrabold text-muted">
                {r.n > 0 && rk <= 3 ? MEDALS[rk - 1] : rk}
              </span>
              <span className="text-2xl">{p?.emoji ?? "❔"}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p?.nickname ?? "?"}
                {p && p.status !== "active" && <span className="ml-1 text-xs text-muted">(ออกแล้ว)</span>}
              </span>
              <span className={`text-2xl font-extrabold tabular-nums ${color}`}>{r.n}</span>
              <span className="text-sm text-muted">{unit}</span>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
