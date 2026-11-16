"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { guessLosers } from "@/lib/engine/guess";
import type { GuessState } from "@/lib/types";
import { Button } from "../../ui/Button";

const MEDALS = ["🥇", "🥈", "🥉"];

export function GuessSummary({ state }: { state: GuessState }) {
  const room = useRoom();
  const ids = Array.from(new Set([...state.order, ...Object.keys(state.scores)]));
  const ranked = ids.map((id) => ({ id, n: state.scores[id] ?? 0 })).sort((a, b) => b.n - a.n);
  const losers = guessLosers(state);
  const loserSet = new Set(losers);
  const top = ranked[0]?.n ?? 0;
  const rankOf = (n: number) => ranked.findIndex((r) => r.n === n) + 1;
  const correct = state.history.filter((h) => h.result === "correct").length;
  const drinkIds = Object.keys(state.drinks).filter((id) => state.drinks[id] > 0);

  useEffect(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.45 } });
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-6">
      <div className="text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">สรุปผลใบ้คำ-ทายคำ</h1>
        <p className="mt-1 text-muted">
          เล่นไป {state.history.length} ตา · ทายถูก {correct} คำ
        </p>
      </div>

      {/* บทลงโทษ */}
      {losers.length > 0 && (
        <motion.section
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 12 }}
          className="tint-rose card-3d rounded-[2rem] p-6 text-center"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">
            ทายถูกน้อยที่สุด{losers.length > 1 ? ` (${losers.length} คน)` : ""}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {losers.map((id) => (
              <span key={id} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-xl font-extrabold">
                {room.player(id)?.emoji} {room.player(id)?.nickname ?? "?"}
              </span>
            ))}
          </div>
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="mt-4 text-3xl font-extrabold"
          >
            โดนลงโทษ: ดื่ม 1 แก้ว! 🍻
          </motion.div>
          {state.penaltyRecorded && <div className="mt-2 text-sm font-semibold opacity-80">✓ บันทึกการดื่มแล้ว</div>}
        </motion.section>
      )}

      {/* Leaderboard */}
      <ol className="card-3d flex flex-col gap-2 rounded-3xl bg-panel p-4">
        {ranked.map((r, i) => {
          const p = room.player(r.id);
          const rank = rankOf(r.n);
          const lose = loserSet.has(r.id);
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                lose ? "border-rose-400/40 bg-rose-500/10" : r.n === top && top > 0 ? "border-sun/40 bg-sun/10" : "border-white/5 bg-white/[0.04]"
              }`}
            >
              <span className="w-8 text-center text-lg font-extrabold text-muted">
                {r.n > 0 && rank <= 3 ? MEDALS[rank - 1] : rank}
              </span>
              <span className="text-2xl">{p?.emoji ?? "❔"}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p?.nickname ?? "?"}
                {lose && <span className="ml-1.5 text-xs font-bold text-rose-300">🍻 โดนดื่ม</span>}
                {p && p.status !== "active" && <span className="ml-1 text-xs text-muted">(ออกแล้ว)</span>}
              </span>
              <span className="text-2xl font-extrabold tabular-nums">{r.n}</span>
              <span className="text-sm text-muted">คะแนน</span>
            </motion.li>
          );
        })}
      </ol>

      {/* คำที่เล่นไป */}
      {state.history.length > 0 && (
        <section className="card-3d rounded-3xl bg-panel p-4">
          <h2 className="mb-3 text-sm font-bold text-white/80">📜 คำลับทั้งหมด</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {state.history.map((h) => (
              <li key={h.turnNo} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                <span>{h.result === "correct" ? "✅" : h.result === "timeout" ? "⏰" : "⏭️"}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{h.word}</span>
                <span className="shrink-0 text-xs text-white/50">
                  {room.player(h.giver)?.emoji} ใบ้
                  {h.winner && ` → ${room.player(h.winner)?.emoji ?? "?"} ทายถูก`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* สถิติการดื่ม (สะสมข้ามเกม) */}
      {drinkIds.length > 0 && (
        <section className="card-3d rounded-3xl bg-panel p-4">
          <h2 className="mb-3 text-sm font-bold text-white/80">🍺 สถิติการดื่มจากบทลงโทษ</h2>
          <ul className="grid grid-cols-2 gap-2">
            {drinkIds
              .sort((a, b) => state.drinks[b] - state.drinks[a])
              .map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-2.5 text-sm">
                  <span className="text-lg">{room.player(id)?.emoji ?? "❔"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{room.player(id)?.nickname ?? "?"}</span>
                  <span className="font-extrabold text-sun">{state.drinks[id]} แก้ว</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {room.isHost ? (
        <div className="flex flex-col gap-3">
          {losers.length > 0 && (
            <Button
              tone="sun"
              size="lg"
              disabled={state.penaltyRecorded}
              onClick={() => room.dispatch("guess.recordPenalty")}
            >
              {state.penaltyRecorded ? "✓ บันทึกการดื่มแล้ว" : "🍺 บันทึกสถิติการดื่ม"}
            </Button>
          )}
          <Button tone="mint" size="lg" onClick={() => room.dispatch("guess.playAgain")}>
            🔄 เล่นอีกรอบ
          </Button>
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("game.end")}>
            ⚙️ กลับไปหน้าตั้งค่า
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted">รอหัวหน้าห้องเลือกว่าจะเล่นอีกรอบหรือไม่...</p>
      )}
    </main>
  );
}
