"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { Dices, Eye, EyeOff, Send, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { guessGiver, guessTotalTurns } from "@/lib/engine/guess";
import type { GuessChat, GuessSecret, GuessState } from "@/lib/types";
import { wordsFor } from "@/lib/words-data";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { formatTime, useDeadline, useRemaining } from "../../ui/Countdown";
import { Modal } from "../../ui/Modal";
import { HostMenu } from "../HostMenu";
import { GuessSummary } from "./GuessSummary";

let celebratedTurn = "";

export function GuessGame() {
  const room = useRoom();
  const s = room.snap.state as GuessState;
  const giverId = guessGiver(s);
  const amGiver = giverId === room.me;

  // หมดเวลา → ช่วยกันปิดตา (คนใบ้ก่อน → หัวหน้าห้อง → ทุกคน กันเครื่องใดเครื่องหนึ่งหลุด)
  const delay = amGiver ? 300 : room.isHost ? 1200 : 3000;
  useDeadline(
    s.phase === "guessing" ? s.round?.endsAt : null,
    `${s.turnNo}`,
    () => room.dispatch("guess.timeout"),
    delay,
  );

  if (s.phase === "finished") return <GuessSummary state={s} />;

  const total = guessTotalTurns(s);
  const lap = s.order.length ? Math.floor(s.turnNo / s.order.length) + 1 : 1;

  let body: React.ReactNode;
  if (s.phase === "setup") body = amGiver ? <WordSetup /> : <WaitingForWord giverId={giverId} />;
  else if (s.phase === "guessing") body = amGiver ? <GiverPlay state={s} /> : <GuesserPlay state={s} />;
  else body = <Reveal state={s} />;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted">
          🤫 ใบ้คำ-ทายคำ · ตาที่ {Math.min(s.turnNo + 1, total)}/{total}
          {s.laps > 1 && ` · รอบ ${Math.min(lap, s.laps)}/${s.laps}`}
        </span>
        <HostMenu
          actions={[{ label: "🏁 จบเกมเลย ดูสรุปผล", tone: "sun", onClick: () => room.dispatch("guess.finish") }]}
        />
      </div>
      {body}
      <MiniScores state={s} giverId={giverId} />
    </main>
  );
}

// ---------- ช่วงที่ 1: ตั้งคำลับ ----------
function WordSetup() {
  const room = useRoom();
  const [word, setWord] = useState("");
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  function random() {
    const pool = wordsFor("all", "global");
    let next = word;
    while (pool.length > 1 && next === word) next = pool[Math.floor(Math.random() * pool.length)];
    setWord(next);
    navigator.vibrate?.(20);
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || busy) return;
    setBusy(true);
    await room.dispatch("guess.setWord", { word });
    setBusy(false);
  }

  return (
    <motion.form
      onSubmit={start}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="tint-sky card-3d flex flex-col gap-4 rounded-[2rem] p-6"
    >
      <div className="text-center">
        <div className="text-5xl">🤫</div>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">ตาคุณเป็นคนใบ้!</h2>
        <p className="mt-1 text-sm text-white/70">ตั้งคำลับให้เพื่อนทาย — เพื่อนจะไม่เห็นคำนี้เด็ดขาด</p>
      </div>
      <div className="relative">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value.slice(0, 40))}
          type={hidden ? "password" : "text"}
          placeholder="พิมพ์คำศัพท์หรือวลีลับ..."
          aria-label="คำลับ"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-white/15 bg-black/30 py-4 pl-4 pr-12 text-center text-2xl font-extrabold text-white placeholder:text-base placeholder:font-medium placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
        />
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "แสดงคำลับ" : "ซ่อนคำลับ"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted transition-colors hover:bg-white/10 hover:text-white"
        >
          {hidden ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button tone="ghost" size="lg" onClick={random}>
          <Dices size={22} /> สุ่มคำ
        </Button>
        <Button type="submit" tone="mint" size="lg" disabled={!word.trim() || busy}>
          ⏱️ เริ่มจับเวลา!
        </Button>
      </div>
    </motion.form>
  );
}

function WaitingForWord({ giverId }: { giverId: string | null }) {
  const room = useRoom();
  const giver = room.player(giverId);
  return (
    <div className="card-3d flex flex-col items-center gap-4 rounded-[2rem] bg-panel p-8 text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
        <Avatar player={giver} size="xl" />
      </motion.div>
      <div>
        <div className="text-2xl font-extrabold">
          กำลังรอ {giver?.nickname ?? "คนใบ้"} ตั้งคำลับ
          <span className="inline-flex w-8 justify-start">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              >
                .
              </motion.span>
            ))}
          </span>
        </div>
        <p className="mt-1 text-muted">เตรียมตัวทายให้ไวที่สุด! 🧠</p>
      </div>
    </div>
  );
}

// ---------- ช่วงที่ 2: จับเวลา ----------
function BigTimer({ endsAt, total }: { endsAt: number; total: number }) {
  const left = useRemaining(endsAt, 100);
  const sec = Math.ceil(left / 1000);
  const warn = left > 0 && left <= 10_000;
  const pct = Math.max(0, Math.min(1, left / total));

  useEffect(() => {
    if (warn) navigator.vibrate?.(60);
  }, [warn, sec]);

  return (
    <div
      className={`card-3d overflow-hidden rounded-[2rem] p-5 text-center transition-colors duration-300 ${
        warn ? "tint-rose" : "bg-panel"
      }`}
    >
      <motion.div
        key={warn ? sec : "calm"}
        initial={warn ? { scale: 1.35, rotate: -3 } : false}
        animate={warn ? { scale: 1, rotate: 0, x: [0, -6, 6, -4, 4, 0] } : { scale: 1 }}
        transition={{ duration: 0.45 }}
        className={`text-7xl font-extrabold tabular-nums tracking-tight ${warn ? "text-rose-300" : ""}`}
      >
        {formatTime(left)}
      </motion.div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            warn ? "bg-gradient-to-r from-rose-400 to-orange-300" : "bg-gradient-to-r from-sky to-mint"
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      {warn && <div className="mt-2 animate-pulse text-sm font-bold text-rose-200">🔥 10 วินาทีสุดท้าย!</div>}
    </div>
  );
}

function GiverPlay({ state }: { state: GuessState }) {
  const room = useRoom();
  const secret = room.snap.secret as GuessSecret | null;
  const word = secret?.kind === "guess" ? secret.word : "...";
  const [pick, setPick] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const round = state.round!;

  return (
    <>
      <BigTimer endsAt={round.endsAt} total={round.endsAt - round.startsAt} />

      <div className="rounded-[2rem] bg-gradient-to-br from-lime-300 via-emerald-300 to-sky-400 p-[2px] shadow-[0_30px_80px_-20px_rgba(163,230,53,0.45)]">
        <div className="rounded-[calc(2rem-2px)] bg-[#0c1220]/95 p-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-300">คำลับของคุณ · ห้ามให้ใครเห็น!</div>
          <div className="mt-3 break-words text-5xl font-extrabold leading-tight">{word}</div>
        </div>
      </div>

      <Button tone="mint" size="xl" className="w-full" onClick={() => setPick(true)}>
        🎉 มีคนตอบถูกแล้ว!
      </Button>
      {confirmSkip ? (
        <div className="grid grid-cols-2 gap-3">
          <Button tone="ghost" size="lg" onClick={() => setConfirmSkip(false)}>
            ใบ้ต่อ
          </Button>
          <Button tone="coral" size="lg" onClick={() => room.dispatch("guess.skip")}>
            ยืนยันข้าม
          </Button>
        </div>
      ) : (
        <Button tone="coral" size="lg" className="w-full" onClick={() => setConfirmSkip(true)}>
          <SkipForward size={20} /> ข้ามคำนี้ (ไม่มีใครได้คะแนน)
        </Button>
      )}

      <ChatFeed state={state} onPick={() => setPick(true)} />
      <WinnerPicker open={pick} onClose={() => setPick(false)} state={state} />
    </>
  );
}

function GuesserPlay({ state }: { state: GuessState }) {
  const room = useRoom();
  const round = state.round!;
  const giver = room.player(round.giver);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setText("");
    await room.dispatch("guess.guess", { text: t });
    setBusy(false);
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <Avatar player={giver} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">กำลังใบ้</div>
          <div className="truncate text-lg font-bold">{giver?.nickname ?? "-"}</div>
        </div>
        <span className="text-3xl">🗣️</span>
      </div>

      <BigTimer endsAt={round.endsAt} total={round.endsAt - round.startsAt} />

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 40))}
          placeholder="พิมพ์คำตอบ หรือตะโกนตอบในวงก็ได้!"
          aria-label="คำตอบ"
          autoComplete="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 text-lg font-semibold text-white placeholder:text-sm placeholder:font-medium placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
        />
        <Button type="submit" tone="sky" size="lg" disabled={!text.trim() || busy} aria-label="ส่งคำตอบ">
          <Send size={20} />
        </Button>
      </form>
      <p className="-mt-3 text-center text-xs text-muted">พิมพ์ตรงกับคำลับเป๊ะ = ชนะทันที (ไม่สนช่องว่าง/ตัวพิมพ์)</p>

      <ChatFeed state={state} />
    </>
  );
}

function ChatFeed({ state, onPick }: { state: GuessState; onPick?: () => void }) {
  const room = useRoom();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state.chat.length]);

  return (
    <section className="card-3d rounded-3xl bg-panel p-4">
      <h3 className="mb-3 flex items-center justify-between text-sm font-bold text-white/80">
        <span>💬 คำตอบจากเพื่อน</span>
        {onPick && <span className="text-xs font-medium text-muted">แตะเพื่อเลือกผู้ชนะ</span>}
      </h3>
      {state.chat.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted">ยังไม่มีใครพิมพ์ตอบ — ตะโกนในวงก็ได้นะ!</p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {state.chat.map((c: GuessChat) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                  c.hit ? "border-emerald-300/50 bg-emerald-400/15" : "border-white/5 bg-white/[0.04]"
                } ${onPick ? "cursor-pointer hover:bg-white/[0.08]" : ""}`}
                onClick={onPick}
              >
                <span className="text-lg">{room.player(c.player)?.emoji ?? "❔"}</span>
                <span className="shrink-0 font-semibold text-white/60">{room.player(c.player)?.nickname}:</span>
                <span className="min-w-0 flex-1 truncate font-bold">{c.text}</span>
              </motion.li>
            ))}
          </AnimatePresence>
          <div ref={endRef} />
        </ul>
      )}
    </section>
  );
}

function WinnerPicker({ open, onClose, state }: { open: boolean; onClose: () => void; state: GuessState }) {
  const room = useRoom();
  const [busy, setBusy] = useState(false);
  const giver = state.round?.giver;
  // คนที่พิมพ์ตอบล่าสุดขึ้นก่อน
  const recent = [...state.chat].reverse().map((c) => c.player);
  const ids = Array.from(new Set([...recent, ...state.order, ...room.players.map((p) => p.id)])).filter(
    (id) => id !== giver && room.player(id)?.status === "active",
  );
  const lastGuess = (id: string) => [...state.chat].reverse().find((c) => c.player === id)?.text;

  return (
    <Modal open={open} onClose={onClose} title="🎉 ใครตอบถูกคนแรก?">
      <div className="grid grid-cols-2 gap-2">
        {ids.map((id) => {
          const p = room.player(id);
          const g = lastGuess(id);
          return (
            <motion.button
              key={id}
              type="button"
              disabled={busy}
              whileTap={{ scale: 0.94 }}
              onClick={async () => {
                setBusy(true);
                const ok = await room.dispatch("guess.correct", { playerId: id });
                setBusy(false);
                if (ok) onClose();
              }}
              className="btn-3d flex items-center gap-2 rounded-2xl border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
            >
              <span className="text-3xl">{p?.emoji ?? "❔"}</span>
              <span className="min-w-0">
                <span className="block truncate font-bold">{p?.nickname}</span>
                {g && <span className="block truncate text-xs text-white/50">“{g}”</span>}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted">แตะชื่อคนที่ตอบถูก → ได้ +1 คะแนน และจบตานี้ทันที</p>
    </Modal>
  );
}

// ---------- ช่วงที่ 3: เฉลย ----------
function Reveal({ state }: { state: GuessState }) {
  const room = useRoom();
  const r = state.reveal;
  const nextTurn = state.turnNo + 1;
  const isLast = nextTurn >= guessTotalTurns(state);
  const nextGiver = state.order.length ? state.order[nextTurn % state.order.length] : null;
  const canNext = room.isHost || room.me === r?.giver || room.me === nextGiver;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const key = `${room.code}:${state.turnNo}`;
    if (r?.result === "correct" && celebratedTurn !== key) {
      celebratedTurn = key;
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 } });
      navigator.vibrate?.([60, 40, 120]);
    }
  }, [r?.result, room.code, state.turnNo]);

  if (!r) return null;
  const winner = room.player(r.winner);
  const giver = room.player(r.giver);
  const tone = r.result === "correct" ? "tint-mint" : r.result === "timeout" ? "tint-rose" : "tint-sky";

  return (
    <>
      <motion.section
        initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className={`card-3d rounded-[2rem] p-6 text-center ${tone}`}
      >
        <div className="text-5xl">{r.result === "correct" ? "🎉" : r.result === "timeout" ? "⏰" : "⏭️"}</div>
        <div className="mt-2 text-xl font-extrabold">
          {r.result === "correct"
            ? `${winner?.nickname ?? "?"} ทายถูก!`
            : r.result === "timeout"
              ? "หมดเวลา! ไม่มีใครทายถูก"
              : `${giver?.nickname ?? "คนใบ้"} ข้ามคำนี้`}
        </div>
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] opacity-70">เฉลยคำลับ</div>
        <div className="mt-1 break-words text-4xl font-extrabold leading-tight">{r.word}</div>
        {r.result === "correct" && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-bold">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              {winner?.emoji} {winner?.nickname} +1
            </span>
            {state.giverPoint && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                {giver?.emoji} {giver?.nickname} (คนใบ้) +1
              </span>
            )}
          </div>
        )}
      </motion.section>

      {canNext ? (
        <Button
          tone={isLast ? "sun" : "mint"}
          size="xl"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await room.dispatch("guess.next", { expectedTurn: state.turnNo });
            setBusy(false);
          }}
        >
          {isLast ? "🏁 ดูสรุปผล" : `▶️ ตาถัดไป: ${room.player(nextGiver)?.nickname ?? ""} ใบ้`}
        </Button>
      ) : (
        <p className="py-2 text-center font-semibold text-muted">
          ⏳ รอ {room.player(nextGiver)?.nickname ?? "คนใบ้คนถัดไป"} หรือหัวหน้าห้องกดไปต่อ...
        </p>
      )}
    </>
  );
}

function MiniScores({ state, giverId }: { state: GuessState; giverId: string | null }) {
  const room = useRoom();
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
              id === giverId && state.phase !== "reveal" ? "border-lime-300/40 bg-lime-300/10" : "border-white/5 bg-white/[0.04]"
            }`}
          >
            <span className="text-xl">{room.player(id)?.emoji ?? "❔"}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {room.player(id)?.nickname ?? "?"}
              {id === giverId && state.phase !== "reveal" && <span className="ml-1">🤫</span>}
            </span>
            <motion.span
              key={state.scores[id] ?? 0}
              initial={{ scale: 1.8, color: "#a3e635" }}
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
