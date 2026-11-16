"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { fillLosers } from "@/lib/engine/fill";
import type { FillState } from "@/lib/types";
import { Button } from "../../ui/Button";

const MEDALS = ["🥇", "🥈", "🥉"];

export function FillSummary({ state }: { state: FillState }) {
  const room = useRoom();
  const losers = fillLosers(state);
  const loserSet = new Set(losers);
  const team = state.mode === "team";

  const rows = team
    ? state.teams.filter((t) => t.members.length > 0).map((t) => ({ id: t.id, n: state.teamScores[t.id] ?? 0, team: t }))
    : state.order.map((id) => ({ id, n: state.scores[id] ?? 0, team: null }));
  rows.sort((a, b) => b.n - a.n);
  const rankOf = (n: number) => rows.findIndex((r) => r.n === n) + 1;
  const loserTeams = team ? state.teams.filter((t) => t.members.some((m) => loserSet.has(m))) : [];
  const answered = state.history.filter((h) => h.winner).length;

  useEffect(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.45 } });
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-6">
      <div className="text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">สรุปผลเติมคำ</h1>
        <p className="mt-1 text-muted">
          เล่นไป {state.history.length} ข้อ · ตอบถูก {answered} ข้อ
        </p>
      </div>

      {losers.length > 0 && (
        <motion.section
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 12 }}
          className="tint-rose card-3d rounded-[2rem] p-6 text-center"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">
            {team ? "ทีมคะแนนน้อยที่สุด" : "คะแนนน้อยที่สุด"}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {team
              ? loserTeams.map((t) => (
                  <span key={t.id} className="rounded-2xl border-2 px-3 py-1.5 text-xl font-extrabold" style={{ borderColor: t.color }}>
                    {t.name}
                  </span>
                ))
              : losers.map((id) => (
                  <span key={id} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-1.5 text-xl font-extrabold">
                    {room.player(id)?.emoji} {room.player(id)?.nickname ?? "?"}
                  </span>
                ))}
          </div>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="mt-4 text-3xl font-extrabold">
            ดื่ม 1 แก้ว! 🍻
          </motion.div>
          {team && (
            <p className="mt-2 text-sm opacity-80">
              {losers.map((id) => `${room.player(id)?.emoji ?? ""} ${room.player(id)?.nickname ?? "?"}`).join(" · ")}
            </p>
          )}
          {state.penaltyRecorded && <div className="mt-2 text-sm font-semibold opacity-80">✓ บันทึกการดื่มแล้ว</div>}
        </motion.section>
      )}

      <ol className="card-3d flex flex-col gap-2 rounded-3xl bg-panel p-4">
        {rows.map((r, i) => {
          const rank = rankOf(r.n);
          const lose = r.team ? r.team.members.some((m) => loserSet.has(m)) : loserSet.has(r.id);
          const p = r.team ? null : room.player(r.id);
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                lose ? "border-rose-400/40 bg-rose-500/10" : rank === 1 && r.n > 0 ? "border-sun/40 bg-sun/10" : "border-white/5 bg-white/[0.04]"
              }`}
            >
              <span className="w-8 text-center text-lg font-extrabold text-muted">{r.n > 0 && rank <= 3 ? MEDALS[rank - 1] : rank}</span>
              {r.team ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold" style={{ color: r.team.color }}>
                    {r.team.name}
                  </span>
                  <span className="block truncate text-xs text-white/60">
                    {r.team.members.map((id) => `${room.player(id)?.emoji ?? ""}${room.player(id)?.nickname ?? ""}`).join(" · ")}
                  </span>
                </span>
              ) : (
                <>
                  <span className="text-2xl">{p?.emoji ?? "❔"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {p?.nickname ?? "?"}
                    {lose && <span className="ml-1.5 text-xs font-bold text-rose-300">🍻 โดนดื่ม</span>}
                  </span>
                </>
              )}
              <span className="text-2xl font-extrabold tabular-nums">{r.n}</span>
              <span className="text-sm text-muted">คะแนน</span>
            </motion.li>
          );
        })}
      </ol>

      {state.history.length > 0 && (
        <section className="card-3d rounded-3xl bg-panel p-4">
          <h2 className="mb-3 text-sm font-bold text-white/80">📜 เฉลยทุกข้อ</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {state.history.map((h) => (
              <li key={h.no} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                <span className="w-6 text-xs text-muted">{h.no + 1}.</span>
                <span className="min-w-0 flex-1 truncate font-bold">{h.word}</span>
                <span className="shrink-0 text-xs text-white/50">
                  {h.winner ? `⚡ ${room.player(h.winner)?.emoji ?? ""} ${room.player(h.winner)?.nickname ?? "?"}` : "⏰ หมดเวลา"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {room.isHost ? (
        <div className="flex flex-col gap-3">
          {losers.length > 0 && (
            <Button tone="sun" size="lg" disabled={state.penaltyRecorded} onClick={() => room.dispatch("fill.recordPenalty")}>
              {state.penaltyRecorded ? "✓ บันทึกการดื่มแล้ว" : "🍺 บันทึกสถิติการดื่ม"}
            </Button>
          )}
          <Button tone="mint" size="lg" onClick={() => room.dispatch("fill.playAgain")}>
            🔄 เล่นอีกรอบ (คำชุดใหม่)
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
