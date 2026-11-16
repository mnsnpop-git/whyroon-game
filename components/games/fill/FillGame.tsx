"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { fillTeamOf } from "@/lib/engine/fill";
import type { FillState } from "@/lib/types";
import { Button } from "../../ui/Button";
import { formatTime, useDeadline, useRemaining } from "../../ui/Countdown";
import { HostMenu } from "../HostMenu";
import { FillSummary } from "./FillSummary";

let celebrated = "";

export function FillGame() {
  const room = useRoom();
  const s = room.snap.state as FillState;

  // หมดเวลาข้อ → แจ้งเซิร์ฟเวอร์ (หัวหน้าห้องก่อน คนอื่นสำรอง)
  useDeadline(
    s.phase === "question" ? s.question?.endsAt : null,
    `q${s.qNo}`,
    () => room.dispatch("fill.timeout"),
    room.isHost ? 150 : 1500,
  );
  // เฉลยครบเวลา → ไปข้อถัดไปอัตโนมัติ
  useDeadline(
    s.phase === "reveal" ? s.reveal?.nextAt : null,
    `n${s.qNo}`,
    () => room.dispatch("fill.next", { expectedNo: s.qNo }),
    room.isHost ? 100 : 1500,
  );

  if (s.phase === "finished") return <FillSummary state={s} />;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted">
          🧩 ข้อที่ {Math.min(s.qNo + 1, s.total)}/{s.total} · {s.mode === "team" ? "โหมดทีม" : "โหมดเดี่ยว"}
        </span>
        <HostMenu actions={[{ label: "🏁 จบเกมเลย ดูสรุปผล", tone: "sun", onClick: () => room.dispatch("fill.finish") }]} />
      </div>

      {s.phase === "question" && s.question ? <Question key={`q${s.qNo}`} state={s} /> : <Reveal state={s} />}

      <Scores state={s} />
    </main>
  );
}

function Tiles({ tiles, word }: { tiles: (string | null)[]; word?: string[] }) {
  const long = tiles.length > 10;
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {tiles.map((c, i) =>
        c === " " ? (
          <span key={i} className="w-3" />
        ) : (
          <motion.span
            key={i}
            initial={{ rotateY: c === null && word ? -90 : 0 }}
            animate={{ rotateY: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex items-center justify-center rounded-xl border-2 font-extrabold ${
              long ? "h-11 min-w-9 px-1 text-2xl" : "h-14 min-w-12 px-1.5 text-3xl"
            } ${
              c === null
                ? word
                  ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                  : "border-dashed border-white/30 bg-white/[0.03] text-white/30"
                : "border-white/15 bg-white/10 text-white"
            }`}
          >
            {c ?? word?.[i] ?? "_"}
          </motion.span>
        ),
      )}
    </div>
  );
}

function Question({ state }: { state: FillState }) {
  const room = useRoom();
  const q = state.question!;
  const left = useRemaining(q.endsAt, 100);
  const warn = left > 0 && left <= 5000;
  const pct = Math.max(0, Math.min(1, left / Math.max(1, q.endsAt - q.startsAt)));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const playing = state.order.includes(room.me);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const res = await room.dispatchRaw("fill.answer", { text: t, qNo: state.qNo });
    setBusy(false);
    if (res.ok) {
      setText("");
      setShake((n) => n + 1); // ถ้าถูก หน้าจะเปลี่ยนเป็นเฉลยเอง ถ้าผิด กล่องจะสั่น
      navigator.vibrate?.(30);
    }
  }

  return (
    <>
      <section className={`card-3d rounded-[2rem] p-5 ${warn ? "tint-rose" : "bg-panel"}`}>
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">{q.category}</span>
          <motion.span
            key={warn ? Math.ceil(left / 1000) : "calm"}
            initial={warn ? { scale: 1.4 } : false}
            animate={{ scale: 1 }}
            className={`text-3xl font-extrabold tabular-nums ${warn ? "text-rose-300" : ""}`}
          >
            {formatTime(left)}
          </motion.span>
        </div>
        <motion.div key={`${state.qNo}-${shake}`} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }}>
          <Tiles tiles={q.tiles} />
        </motion.div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              warn ? "bg-rose-400" : "bg-gradient-to-r from-cyan-300 to-mint"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </section>

      {playing ? (
        <form onSubmit={send} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 60))}
            placeholder="พิมพ์คำเต็มๆ แล้วกดส่ง!"
            aria-label="คำตอบ"
            autoComplete="off"
            autoFocus
            enterKeyHint="send"
            className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-4 text-xl font-bold text-white placeholder:text-base placeholder:font-medium placeholder:text-white/30 transition focus:border-cyan-300/60 focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
          />
          <Button type="submit" tone="sky" size="lg" disabled={!text.trim() || busy} aria-label="ส่งคำตอบ">
            <Send size={22} />
          </Button>
        </form>
      ) : (
        <p className="text-center text-muted">👀 คุณดูอยู่ข้างสนาม — จะได้เล่นข้อถัดไป</p>
      )}

      {state.feed.length > 0 && (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold text-muted">❌ คำตอบที่ยังไม่ถูก</h3>
          <ul className="flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {state.feed.map((f) => (
                <motion.li
                  key={f.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs"
                >
                  {room.player(f.player)?.emoji} <span className="text-white/50 line-through">{f.text}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}
    </>
  );
}

function Reveal({ state }: { state: FillState }) {
  const room = useRoom();
  const r = state.reveal;
  const left = useRemaining(r?.nextAt, 200);

  useEffect(() => {
    const key = `${room.code}:${r?.no}:${r?.at}`;
    if (r?.winner && celebrated !== key) {
      celebrated = key;
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.4 } });
      if (r.winner === room.me) navigator.vibrate?.([60, 40, 120]);
    }
  }, [r, room.code, room.me]);

  if (!r) return null;
  const winner = room.player(r.winner);
  const team = state.teams.find((t) => t.id === r.team);
  return (
    <motion.section
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 15 }}
      className={`card-3d rounded-[2rem] p-6 text-center ${r.winner ? "tint-mint" : "tint-rose"}`}
    >
      <div className="text-5xl">{r.winner ? "⚡" : "⏰"}</div>
      <div className="mt-2 text-2xl font-extrabold">
        {r.winner ? `${winner?.emoji ?? ""} ${winner?.nickname ?? "?"} ตอบไวที่สุด! +1` : "หมดเวลา! ไม่มีใครตอบถูก"}
      </div>
      {team && (
        <div className="mt-1 text-sm font-bold" style={{ color: team.color }}>
          {team.name} +1
        </div>
      )}
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] opacity-70">เฉลย</div>
      <div className="mt-1 break-words text-4xl font-extrabold leading-tight">{r.word}</div>
      <div className="mt-4 text-sm text-white/60">
        {state.qNo + 1 >= state.total ? "สรุปผล" : "ข้อถัดไป"}ใน {Math.max(0, Math.ceil(left / 1000))} วิ...
      </div>
      {room.isHost && (
        <Button tone="ghost" size="sm" className="mt-3" onClick={() => room.dispatch("fill.next", { expectedNo: state.qNo })}>
          ⏭️ ไปต่อเลย
        </Button>
      )}
    </motion.section>
  );
}

function Scores({ state }: { state: FillState }) {
  const room = useRoom();
  if (state.mode === "team") {
    const teams = [...state.teams].sort((a, b) => (state.teamScores[b.id] ?? 0) - (state.teamScores[a.id] ?? 0));
    const mine = fillTeamOf(state, room.me);
    return (
      <section className="card-3d rounded-3xl bg-panel p-4">
        <h3 className="mb-3 text-sm font-bold text-white/80">🏆 คะแนนทีม</h3>
        <ul className="grid grid-cols-2 gap-2">
          {teams.map((t) => (
            <motion.li
              layout
              key={t.id}
              className="rounded-2xl border-2 p-3"
              style={{ borderColor: `${t.color}${mine?.id === t.id ? "" : "66"}`, backgroundColor: `${t.color}1a` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold">{t.name}</span>
                <span className="text-2xl font-extrabold tabular-nums" style={{ color: t.color }}>
                  {state.teamScores[t.id] ?? 0}
                </span>
              </div>
              <div className="mt-1 truncate text-sm">{t.members.map((id) => room.player(id)?.emoji ?? "❔").join(" ")}</div>
            </motion.li>
          ))}
        </ul>
      </section>
    );
  }
  const sorted = [...state.order].sort((a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0));
  return (
    <section className="card-3d rounded-3xl bg-panel p-4">
      <h3 className="mb-3 text-sm font-bold text-white/80">🏆 คะแนนตอนนี้</h3>
      <ul className="grid grid-cols-2 gap-2">
        {sorted.map((id) => (
          <motion.li
            layout
            key={id}
            className={`flex items-center gap-2 rounded-2xl border p-2.5 ${
              id === room.me ? "border-cyan-300/40 bg-cyan-300/10" : "border-white/5 bg-white/[0.04]"
            }`}
          >
            <span className="text-xl">{room.player(id)?.emoji ?? "❔"}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{room.player(id)?.nickname ?? "?"}</span>
            <motion.span
              key={state.scores[id] ?? 0}
              initial={{ scale: 1.8, color: "#22d3ee" }}
              animate={{ scale: 1, color: "#ffffff" }}
              className="text-xl font-extrabold tabular-nums"
            >
              {state.scores[id] ?? 0}
            </motion.span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
