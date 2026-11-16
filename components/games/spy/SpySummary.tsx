"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useRoom } from "@/lib/client/room-store";
import { spyLosers } from "@/lib/engine/spy";
import { SPY_LOCATIONS } from "@/lib/spy-locations";
import type { SpyEndReason, SpyState } from "@/lib/types";
import { Button } from "../../ui/Button";

const REASON: Record<SpyEndReason, string> = {
  caught: "โหวตจับสายลับได้สำเร็จ!",
  wrongAccuse: "โหวตจับผิดคน! สายลับรอดตัว",
  timeout: "หมดเวลา! ไม่มีใครจับสายลับได้",
  spyGuessed: "สายลับทายสถานที่ถูก!",
  spyMissed: "สายลับทายสถานที่ผิด!",
  host: "หัวหน้าห้องสั่งเฉลย",
  spyLeft: "สายลับออกจากห้องไปแล้ว",
  tooFew: "ผู้เล่นเหลือไม่พอ",
};

let celebrated = "";

export function SpySummary({ state }: { state: SpyState }) {
  const room = useRoom();
  const r = state.result!;
  const loc = SPY_LOCATIONS[r.location];
  const losers = spyLosers(state);
  const spiesLost = r.winner === "locals";
  const meSpy = r.spies.includes(room.me);
  const iWon = r.winner && (r.winner === "spies") === meSpy;

  useEffect(() => {
    const key = `${room.code}:${state.round}`;
    if (celebrated === key || !r.winner) return;
    celebrated = key;
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.4 } });
  }, [room.code, state.round, r.winner]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-6">
      <motion.section
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className={`card-3d rounded-[2rem] p-6 text-center ${
          r.winner === "spies" ? "tint-rose" : r.winner === "locals" ? "tint-mint" : "bg-panel"
        }`}
      >
        <div className="text-6xl">{r.winner === "spies" ? "🕵️" : r.winner === "locals" ? "🎉" : "🔍"}</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          {r.winner === "spies" ? "สายลับชนะ!" : r.winner === "locals" ? "คนทั่วไปชนะ!" : "เฉลย"}
        </h1>
        <p className="mt-1 text-white/75">{REASON[r.reason]}</p>
        {r.winner && room.player(room.me) && state.order.includes(room.me) && (
          <p className="mt-2 text-sm font-bold">{iWon ? "✅ ฝั่งคุณชนะ" : "❌ ฝั่งคุณแพ้"}</p>
        )}
        {r.accused && (
          <p className="mt-2 text-sm text-white/70">
            ถูกโหวตจับ: {room.player(r.accused)?.emoji} {room.player(r.accused)?.nickname}
          </p>
        )}
        {r.guess && (
          <p className="mt-2 text-sm text-white/70">
            {room.player(r.guess.by)?.nickname} ทายว่า {SPY_LOCATIONS[r.guess.location]?.emoji}{" "}
            {SPY_LOCATIONS[r.guess.location]?.name}
          </p>
        )}
      </motion.section>

      <section className="card-3d rounded-3xl bg-panel p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">สถานที่ลับคือ</div>
        <div className="mt-1 text-5xl">{loc?.emoji}</div>
        <div className="text-3xl font-extrabold">{loc?.name}</div>
      </section>

      <section className="card-3d rounded-3xl bg-panel p-4">
        <h2 className="mb-3 text-sm font-bold text-white/85">🎭 เฉลยบทบาททุกคน</h2>
        <ul className="flex flex-col gap-1.5">
          {[...state.order]
            .sort((a, b) => Number(r.spies.includes(b)) - Number(r.spies.includes(a)))
            .map((id) => {
              const spy = r.spies.includes(id);
              return (
                <li
                  key={id}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                    spy ? "border-fuchsia-300/40 bg-fuchsia-400/10" : "border-white/5 bg-white/[0.04]"
                  }`}
                >
                  <span className="text-xl">{room.player(id)?.emoji ?? "❔"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{room.player(id)?.nickname ?? "?"}</span>
                  <span className={`shrink-0 font-bold ${spy ? "text-fuchsia-200" : "text-white/60"}`}>
                    {spy ? "🕵️ สายลับ" : r.roles[id] ?? "-"}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>

      {losers.length > 0 && (
        <motion.section
          initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 12 }}
          className="tint-rose card-3d rounded-[2rem] p-6 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-3xl font-extrabold"
          >
            {spiesLost ? "สายลับแพ้: ดื่ม 1 แก้ว! 🍻" : "คนทั่วไปแพ้: ดื่มคนละ 1 แก้ว! 🍻"}
          </motion.div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {losers.map((id) => (
              <span key={id} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-1 font-bold">
                {room.player(id)?.emoji} {room.player(id)?.nickname ?? "?"}
              </span>
            ))}
          </div>
          {state.penaltyRecorded && <div className="mt-2 text-sm font-semibold opacity-80">✓ บันทึกการดื่มแล้ว</div>}
        </motion.section>
      )}

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="card-3d rounded-2xl bg-panel p-4">
          <div className="text-3xl font-extrabold text-fuchsia-300">{state.wins.spies}</div>
          <div className="text-xs text-muted">สายลับชนะ (รอบ)</div>
        </div>
        <div className="card-3d rounded-2xl bg-panel p-4">
          <div className="text-3xl font-extrabold text-mint">{state.wins.locals}</div>
          <div className="text-xs text-muted">คนทั่วไปชนะ (รอบ)</div>
        </div>
      </div>

      {Object.values(state.drinks).some((n) => n > 0) && (
        <section className="card-3d rounded-3xl bg-panel p-4">
          <h2 className="mb-3 text-sm font-bold text-white/85">🍺 สถิติการดื่มสะสม</h2>
          <ul className="grid grid-cols-2 gap-2">
            {Object.entries(state.drinks)
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([id, n]) => (
                <li key={id} className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-2.5 text-sm">
                  <span className="text-lg">{room.player(id)?.emoji ?? "❔"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{room.player(id)?.nickname ?? "?"}</span>
                  <span className="font-extrabold text-sun">{n} แก้ว</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {room.isHost ? (
        <div className="flex flex-col gap-3">
          {losers.length > 0 && (
            <Button tone="sun" size="lg" disabled={state.penaltyRecorded} onClick={() => room.dispatch("spy.recordPenalty")}>
              {state.penaltyRecorded ? "✓ บันทึกการดื่มแล้ว" : "🍺 บันทึกสถิติการดื่ม"}
            </Button>
          )}
          <Button tone="mint" size="lg" onClick={() => room.dispatch("spy.playAgain")}>
            🔄 เล่นรอบใหม่ (สุ่มสถานที่ + สายลับใหม่)
          </Button>
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("game.end")}>
            ⚙️ กลับไปหน้าตั้งค่า
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted">รอหัวหน้าห้องเริ่มรอบใหม่...</p>
      )}
    </main>
  );
}
