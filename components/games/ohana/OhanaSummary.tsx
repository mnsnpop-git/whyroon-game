"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { rankDrinkers } from "@/lib/ohana-rank";
import type { OhanaState } from "@/lib/types";
import { Button } from "../../ui/Button";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM = [
  { place: 1, height: "h-28", color: "bg-gradient-to-b from-slate-100 to-slate-400 text-ink" },
  { place: 0, height: "h-36", color: "bg-gradient-to-b from-[#f7e7c1] to-[#c9a35c] text-ink shadow-[0_0_40px_-8px_rgba(242,201,76,0.6)]" },
  { place: 2, height: "h-20", color: "bg-gradient-to-b from-[#e8b48a] to-[#a8693d] text-ink" },
];

export function OhanaSummary({ state }: { state: OhanaState }) {
  const room = useRoom();
  const ranks = rankDrinkers(state);
  const total = ranks.reduce((sum, r) => sum + r.n, 0);
  const drawn = state.total - state.remaining;
  const podium = ranks.filter((r) => r.n > 0 && r.rank <= 3).slice(0, 3);

  useEffect(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 } });
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-6">
      <div className="text-center">
        <div className="text-6xl">🏁</div>
        <h1 className="mt-1 text-3xl font-extrabold">สรุปผลการดื่ม</h1>
        <p className="mt-1 text-muted">
          เปิดไพ่ไป {drawn} ใบ · ดื่มรวม <b className="text-sun">{total}</b> แก้ว
        </p>
      </div>

      {/* โพเดียม */}
      {podium.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 items-end gap-2">
          {PODIUM.map(({ place, height, color }) => {
            const r = podium[place];
            if (!r) return <div key={place} />;
            const p = room.player(r.id);
            return (
              <motion.div
                key={place}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (2 - place) * 0.25, type: "spring" }}
                className="flex flex-col items-center"
              >
                <div className="text-4xl">{p?.emoji ?? "❔"}</div>
                <div className="w-full truncate text-center font-bold">{p?.nickname ?? "?"}</div>
                <div className="text-sm text-sun">{r.n} แก้ว</div>
                <div
                  className={`mt-1 flex w-full items-start justify-center rounded-t-2xl pt-2 text-3xl ${height} ${color}`}
                >
                  {MEDALS[r.rank - 1]}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-panel p-4 text-center text-muted">ยังไม่มีใครดื่มเลย 😇</p>
      )}

      {/* อันดับทั้งหมด */}
      <ol className="card-3d mt-6 flex flex-col gap-2 rounded-3xl bg-panel p-3">
        {ranks.map((r, i) => {
          const p = room.player(r.id);
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.07 }}
              className="rounded-2xl bg-panel2 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-8 text-center text-lg font-extrabold text-muted">
                  {r.n > 0 && r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}
                </span>
                <span className="text-2xl">{p?.emoji ?? "❔"}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {p?.nickname ?? "?"}
                  {p && p.status !== "active" && <span className="ml-1 text-xs text-muted">(ออกแล้ว)</span>}
                </span>
                <span className="text-2xl font-extrabold tabular-nums text-sun">{r.n}</span>
                <span className="text-sm text-muted">แก้ว</span>
              </div>
              {r.reasons.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 pl-10">
                  {r.reasons.map(([reason, count]) => (
                    <span key={reason} className="rounded-lg bg-panel px-1.5 py-0.5 text-xs">
                      {reason} <b className="text-sun">×{count}</b>
                    </span>
                  ))}
                </div>
              )}
            </motion.li>
          );
        })}
      </ol>

      {room.isHost ? (
        <div className="mt-6 flex flex-col gap-2">
          <Button tone="pink" size="lg" onClick={() => room.dispatch("ohana.newRound")}>
            🔄 เริ่มรอบใหม่ (สับไพ่ + ล้างยอดดื่ม)
          </Button>
          <Button tone="violet" size="lg" onClick={() => room.dispatch("ohana.resume")}>
            ▶️ กลับไปเล่นต่อ
          </Button>
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("game.end")}>
            🚪 กลับไปหน้าตั้งค่า / เลือกเกม
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-center text-muted">รอหัวหน้าห้องเลือกว่าจะเล่นต่อหรือไม่...</p>
      )}
    </main>
  );
}
