"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { Check, Crown, House, Minus, Pause, Play, Plus, SkipForward, Square, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { serverNow } from "@/lib/client/api";
import type { WordsRound, WordsSecret, WordsState, WordsUnit } from "@/lib/types";
import { WORD_CATEGORIES, WORD_SCOPES, isScopedCategory } from "@/lib/words-data";
import { Avatar, PlayerName } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { formatTime, useDeadline, useRemaining } from "../../ui/Countdown";
import { Chip } from "../../ui/Section";
import { RoomSettingsButton } from "../../room/RoomSettings";
import { BackHomeConfirm } from "../BackHome";
import { HostMenu } from "../HostMenu";

export function WordsGame() {
  const room = useRoom();
  const s = room.snap.state as WordsState;
  const round = s.round;

  // ช่วยปิดรอบเมื่อหมดเวลา: คนใบ้ปิดเองหลังส่งคะแนนครบ → หัวหน้าห้อง → ทุกคน (กันเครื่องใดเครื่องหนึ่งหลุด)
  // ระหว่างหยุดเกมไม่ต้องปิดรอบอัตโนมัติ
  const delay = round?.giver === room.me ? 2500 : room.isHost ? 3000 : 5000;
  useDeadline(round?.pausedAt ? null : round?.endsAt, `${s.roundNo}`, () => room.dispatch("words.endRound"), delay);

  if (s.finishedAt && s.phase !== "playing") return <WordsSummary state={s} />;
  if (s.phase === "playing" && round) {
    if (round.giver === room.me) return <GiverView key={`r${s.roundNo}`} state={s} />;
    return <ViewerView state={s} />;
  }
  return <Scoreboard state={s} />;
}

/** เวลาที่เหลือของรอบ — ถ้าหยุดเกมอยู่จะค้างไว้ที่ตอนกดหยุด */
function useRoundClock(round: WordsRound) {
  const liveStart = useRemaining(round.startsAt, 100);
  const liveLeft = useRemaining(round.endsAt, 100);
  const pausedAt = round.pausedAt ?? null;
  if (pausedAt === null) return { paused: false, toStart: liveStart, left: liveLeft };
  return {
    paused: true,
    toStart: Math.max(0, round.startsAt - pausedAt),
    left: Math.max(0, round.endsAt - pausedAt),
  };
}

// ---------- หน้าจอคนใบ้ ----------
function GiverView({ state }: { state: WordsState }) {
  const room = useRoom();
  const round = state.round!;
  const secret = room.snap.secret as WordsSecret | null;
  const deck = secret?.kind === "words" ? secret.deck : [];
  const [idx, setIdx] = useState(round.count);
  const [score, setScore] = useState(round.correct);
  const [flash, setFlash] = useState<"correct" | "pass" | null>(null);
  const [confirmHome, setConfirmHome] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const { paused, toStart, left } = useRoundClock(round);
  const started = toStart <= 0;
  const over = started && left <= 0;
  const warn = started && !over && !paused && left <= 10_000;
  const word = deck[idx];

  // สั่นเตือนทุกวินาทีในช่วง 10 วิสุดท้าย
  const sec = Math.ceil(left / 1000);
  useEffect(() => {
    if (warn) navigator.vibrate?.(120);
  }, [warn, sec]);
  // หมดเวลา → ส่งปิดรอบต่อท้ายคิว (ให้คะแนนที่กดไว้ถึงเซิร์ฟเวอร์ก่อน)
  const finish = () => {
    queue.current = queue.current.then(() => room.dispatch("words.endRound"));
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (!over) return;
    navigator.vibrate?.([400, 100, 400]);
    finishRef.current();
  }, [over]);

  // หยุดเกม: ส่งต่อท้ายคิว ให้คะแนนที่กดไว้ถึงเซิร์ฟเวอร์ก่อน
  const pause = () => {
    queue.current = queue.current.then(() => room.dispatch("words.pause"));
  };
  const resume = () => room.dispatch("words.resume");

  function mark(result: "correct" | "pass") {
    if (paused || !started || over || !word) return;
    if (serverNow() > round.endsAt) return;
    const index = idx;
    setIdx(index + 1);
    if (result === "correct") setScore((n) => n + 1);
    setFlash(result);
    setTimeout(() => setFlash(null), 250);
    navigator.vibrate?.(result === "correct" ? 40 : [20, 30, 20]);
    // ส่งตามลำดับ ไม่ให้แซงกัน
    queue.current = queue.current.then(() => room.dispatchRaw("words.mark", { index, result }));
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col transition-colors duration-300 ${
        warn ? "animate-pulse bg-rose-950" : "bg-ink"
      } ${flash === "correct" ? "!bg-emerald-900" : flash === "pass" ? "!bg-rose-950" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="glow-mint rounded-2xl bg-mint px-3.5 py-1 text-2xl font-extrabold tabular-nums text-ink">
          ✅ {score}
        </div>
        <div
          className={`rounded-2xl px-3 py-1 text-3xl font-extrabold tabular-nums ${
            warn ? "border border-rose-500/40 bg-rose-500/20 text-rose-300" : "border border-white/10 bg-white/5"
          }`}
        >
          {started ? formatTime(left) : formatTime(round.endsAt - round.startsAt)}
        </div>
        <div className="flex items-center gap-2">
          {!over && (
            <Button
              tone={paused ? "mint" : "ghost"}
              size="sm"
              onClick={paused ? resume : pause}
              aria-label={paused ? "เล่นต่อ" : "หยุดเกม"}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              <span className="hidden min-[400px]:inline">{paused ? "ต่อ" : "หยุด"}</span>
            </Button>
          )}
          <Button tone="ghost" size="sm" onClick={finish}>
            จบรอบ
          </Button>
          <RoomSettingsButton />
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 text-center">
        <AnimatePresence mode="popLayout">
          {paused ? (
            <motion.div
              key="paused"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="card-3d flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-panel p-6"
            >
              <div className="text-6xl">⏸️</div>
              <div className="text-3xl font-extrabold">หยุดเกมชั่วคราว</div>
              <p className="text-muted">เวลาหยุดเดินแล้ว คำศัพท์ถูกซ่อนไว้</p>
              <Button tone="mint" size="xl" className="w-full" onClick={resume}>
                <Play size={26} /> เล่นต่อ
              </Button>
              <Button tone="ghost" size="lg" className="w-full" onClick={finish}>
                <Square size={20} /> จบรอบนี้ (นับคะแนนที่ได้)
              </Button>
              {room.isHost && (
                <Button tone="coral" size="lg" className="w-full" onClick={() => setConfirmHome(true)}>
                  <House size={20} /> หยุดเกม กลับหน้าแรก
                </Button>
              )}
            </motion.div>
          ) : !started ? (
            <motion.div
              key={`c${Math.ceil(toStart / 1000)}`}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-[10rem] font-extrabold leading-none text-sun"
            >
              {Math.max(1, Math.ceil(toStart / 1000))}
            </motion.div>
          ) : over ? (
            <motion.div key="over" initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-6xl font-extrabold">
              ⏰ หมดเวลา!
            </motion.div>
          ) : (
            <motion.div
              key={idx}
              initial={{ y: 60, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="break-words text-6xl font-extrabold leading-tight sm:text-7xl"
            >
              {word ?? "คำหมดแล้ว!"}
            </motion.div>
          )}
        </AnimatePresence>
        {started && !over && !paused && (
          <p className="absolute bottom-3 left-0 right-0 text-center text-sm text-muted">
            อย่าให้เพื่อนเห็นจอนะ! 🙈
          </p>
        )}
      </div>

      <div className="grid h-[38dvh] grid-cols-2 gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={paused || !started || over}
          onClick={() => mark("pass")}
          className="btn-3d flex flex-col items-center justify-center rounded-3xl border-rose-500/30 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
        >
          <SkipForward size={56} />
          <span className="mt-1 text-3xl font-extrabold">ข้าม</span>
        </button>
        <button
          type="button"
          disabled={paused || !started || over}
          onClick={() => mark("correct")}
          className="btn-3d glow-mint flex flex-col items-center justify-center rounded-3xl border-emerald-300/40 bg-gradient-to-b from-[#2fd39f] to-mint text-ink"
        >
          <Check size={64} strokeWidth={3} />
          <span className="mt-1 text-3xl font-extrabold">ถูกต้อง +1</span>
        </button>
      </div>
      <BackHomeConfirm open={confirmHome} onClose={() => setConfirmHome(false)} />
    </div>
  );
}

// ---------- หน้าจอคนดู / เพื่อนร่วมทีม ----------
function ViewerView({ state }: { state: WordsState }) {
  const room = useRoom();
  const round = state.round!;
  const unit = state.units.find((u) => u.id === round.unitId);
  const { paused, toStart, left } = useRoundClock(round);
  const started = toStart <= 0;
  const warn = started && !paused && left > 0 && left <= 10_000;
  const canControl = room.isHost;
  const myTeam = unit?.members.includes(room.me);
  const giver = room.player(round.giver);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-60px)] w-full max-w-md flex-col items-center justify-center gap-5 px-4 py-6 text-center">
      <div
        className="card-3d w-full rounded-3xl p-4"
        style={{ backgroundColor: unit?.color ?? "#38BDF8", color: "#090D16" }}
      >
        <div className="text-sm font-bold opacity-75">กำลังเล่น</div>
        <div className="text-3xl font-extrabold">{unit?.name}</div>
        <div className="mt-1 flex items-center justify-center gap-2 text-lg font-semibold">
          คนใบ้: <PlayerName player={giver} />
        </div>
      </div>

      {paused ? (
        <div className="tint-sky card-3d w-full rounded-3xl p-5">
          <div className="text-5xl">⏸️</div>
          <div className="mt-1 text-2xl font-extrabold">หยุดเกมชั่วคราว</div>
          <div className="mt-1 text-lg tabular-nums text-white/70">เหลือเวลา {formatTime(left)}</div>
        </div>
      ) : !started ? (
        <motion.div
          key={Math.ceil(toStart / 1000)}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-9xl font-extrabold text-sun"
        >
          {Math.max(1, Math.ceil(toStart / 1000))}
        </motion.div>
      ) : (
        <div className={`text-8xl font-extrabold tabular-nums ${warn ? "animate-pulse text-coral" : ""}`}>
          {formatTime(left)}
        </div>
      )}

      <div className="card-3d w-full rounded-3xl bg-panel p-4">
        <div className="text-muted">คะแนนรอบนี้</div>
        <motion.div
          key={round.correct}
          initial={{ scale: 1.6, color: "#10B981" }}
          animate={{ scale: 1, color: "#ffffff" }}
          className="text-7xl font-extrabold tabular-nums"
        >
          {round.correct}
        </motion.div>
        <div className="text-sm text-muted">เปิดไปแล้ว {round.count} คำ</div>
      </div>

      <p className="text-2xl font-bold">
        {myTeam ? "🗣️ ทีมคุณกำลังทาย! ตะโกนคำตอบเลย!" : "👀 นั่งดูเพื่อนใบ้ แล้วห้ามบอกนะ!"}
      </p>

      {canControl && (
        <div className="grid w-full grid-cols-2 gap-3">
          {paused ? (
            <Button tone="mint" size="lg" onClick={() => room.dispatch("words.resume")}>
              <Play size={20} /> เล่นต่อ
            </Button>
          ) : (
            <Button tone="ghost" size="lg" disabled={started && left <= 0} onClick={() => room.dispatch("words.pause")}>
              <Pause size={20} /> หยุดเกม
            </Button>
          )}
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("words.endRound")}>
            <Square size={18} /> จบรอบนี้
          </Button>
        </div>
      )}
    </main>
  );
}

let celebratedRound = "";

// ---------- ตารางคะแนน + สรุปรอบ ----------
function Scoreboard({ state }: { state: WordsState }) {
  const room = useRoom();
  const next = state.units[state.unitTurn];
  const nextGiver = next ? next.members[next.nextMember % next.members.length] : null;
  const canStart = room.isHost || nextGiver === room.me;
  const last = state.lastRound;
  const lastUnit = last ? state.units.find((u) => u.id === last.unitId) : null;
  const sorted = [...state.units].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  const cat = WORD_CATEGORIES.find((c) => c.id === state.category);

  // ฉลองครั้งเดียวต่อรอบ (ไม่ยิงซ้ำตอนเปลี่ยนหมวด/ปรับคะแนน)
  const lastCorrect = last?.correct ?? 0;
  useEffect(() => {
    const key = `${room.code}:${state.roundNo}`;
    if (lastCorrect > 0 && celebratedRound !== key) {
      celebratedRound = key;
      confetti({ particleCount: 60 + lastCorrect * 15, spread: 80, origin: { y: 0.4 } });
    }
  }, [room.code, state.roundNo, lastCorrect]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-48 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted">
          ⏱️ ใบ้คำ · {cat?.emoji} {cat?.name}
          {isScopedCategory(state.category) && (state.scope === "th" ? " 🇹🇭" : " 🌏")} · {state.seconds / 60} นาที
        </span>
        <HostMenu
          actions={[
            { label: "🏁 จบเกม ดูสรุปผล", tone: "sun", onClick: () => room.dispatch("words.finish") },
            { label: "👥 กำหนดทีมใหม่", onClick: () => room.dispatch("words.regroup") },
          ]}
        />
      </div>

      <CategoryPicker state={state} />

      {last && (
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card-3d rounded-3xl bg-panel p-4"
        >
          <div className="mb-3 text-center">
            <div className="text-sm text-muted">สรุปรอบของ</div>
            <div className="text-2xl font-extrabold" style={{ color: lastUnit?.color }}>
              {lastUnit?.name}
            </div>
            <div className="mt-1 text-5xl font-extrabold text-mint">+{last.correct}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 font-bold text-mint">✅ ถูก ({last.words.filter((w) => w.result === "correct").length})</div>
              <ul className="flex flex-col gap-1">
                {last.words
                  .filter((w) => w.result === "correct")
                  .map((w, i) => (
                    <li key={i} className="rounded-xl bg-mint/20 px-2 py-1 font-semibold text-mint">
                      {w.text}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-bold text-coral">⏭️ ข้าม ({last.words.filter((w) => w.result === "pass").length})</div>
              <ul className="flex flex-col gap-1">
                {last.words
                  .filter((w) => w.result === "pass")
                  .map((w, i) => (
                    <li key={i} className="rounded-xl bg-coral/20 px-2 py-1 font-semibold text-coral">
                      {w.text}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </motion.section>
      )}

      <section className="card-3d rounded-3xl bg-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Crown size={20} className="text-sun" /> ตารางคะแนนรวม
        </h2>
        <ul className="flex flex-col gap-2">
          {sorted.map((u, i) => (
            <ScoreRow key={u.id} unit={u} rank={i + 1} leader={u.score === top && top > 0} />
          ))}
        </ul>
      </section>

      {!last && (
        <p className="text-center text-lg text-muted">
          🎯 คนใบ้ดูคำบนจอแล้วใบ้ด้วยท่าทางหรือคำพูด (ห้ามพูดคำนั้นตรงๆ!) เพื่อนในทีมทายให้ไวที่สุด
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090d16]/70 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {next && (
            <p className="mb-2 flex items-center justify-center gap-2 text-center">
              <Users size={18} style={{ color: next.color }} />
              <span>
                ต่อไป: <b style={{ color: next.color }}>{next.name}</b> — คนใบ้{" "}
                <PlayerName player={room.player(nextGiver)} className="font-bold" />
              </span>
            </p>
          )}
          {canStart ? (
            <Button tone="mint" size="xl" className="w-full" onClick={() => room.dispatch("words.startRound")}>
              ▶️ เริ่มตาของ {next?.name}
            </Button>
          ) : (
            <p className="py-3 text-center font-semibold text-muted">
              ⏳ รอ {room.player(nextGiver)?.nickname} หรือหัวหน้าห้องกดเริ่ม...
            </p>
          )}
          {room.isHost && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button tone="ghost" onClick={() => room.dispatch("words.regroup")}>
                👥 กำหนดทีมใหม่
              </Button>
              <Button tone="sun" onClick={() => room.dispatch("words.finish")}>
                🏁 จบเกม สรุปผล
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ScoreRow({ unit, rank, leader }: { unit: WordsUnit; rank: number; leader: boolean }) {
  const room = useRoom();
  return (
    <motion.li
      layout
      className="flex items-center gap-3 rounded-2xl p-2.5"
      style={{ backgroundColor: `${unit.color}26`, border: `2px solid ${unit.color}` }}
    >
      <span className="w-6 text-center text-xl font-extrabold">{leader ? "👑" : rank}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold">{unit.name}</div>
        <div className="flex -space-x-1">
          {unit.members.slice(0, 8).map((id) => (
            <Avatar key={id} player={room.player(id)} size="sm" className="scale-75" />
          ))}
        </div>
      </div>
      {room.isHost && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-label="เพิ่มคะแนน"
            onClick={() => room.dispatch("words.adjustScore", { unitId: unit.id, delta: 1 })}
            className="rounded-lg bg-panel2 p-0.5"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            aria-label="ลดคะแนน"
            onClick={() => room.dispatch("words.adjustScore", { unitId: unit.id, delta: -1 })}
            className="rounded-lg bg-panel2 p-0.5"
          >
            <Minus size={14} />
          </button>
        </div>
      )}
      <span className="w-14 text-right text-4xl font-extrabold tabular-nums">{unit.score}</span>
    </motion.li>
  );
}

// ---------- เปลี่ยนหมวดคำระหว่างเกม (ไม่ต้องจบเกม) ----------
function CategoryPicker({ state }: { state: WordsState }) {
  const room = useRoom();
  const cat = WORD_CATEGORIES.find((c) => c.id === state.category);
  const scope = state.scope ?? "global";
  const scoped = isScopedCategory(state.category);
  const scopeInfo = WORD_SCOPES.find((x) => x.id === scope);
  if (!room.isHost) {
    return (
      <p className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-center text-muted">
        หมวดคำ: <b className="text-white">{cat?.emoji} {cat?.name}</b>
        {scoped && (
          <span className="text-white/70">
            {" "}· {scopeInfo?.emoji} {scopeInfo?.name}
          </span>
        )}
      </p>
    );
  }
  return (
    <section className="card-3d rounded-3xl bg-panel p-5">
      <h2 className="mb-3 flex items-center justify-between gap-2 text-lg font-bold">
        <span>📚 หมวดคำรอบถัดไป</span>
        <span className="text-xs font-medium text-muted">เปลี่ยนได้โดยไม่ต้องจบเกม</span>
      </h2>
      <div className="flex flex-wrap gap-2">
        {WORD_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={state.category === c.id}
            onClick={() => room.dispatch("words.setCategory", { category: c.id })}
          >
            {c.emoji} {c.name}
          </Chip>
        ))}
      </div>
      {scoped && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {WORD_SCOPES.map((sc) => (
            <Chip
              key={sc.id}
              active={scope === sc.id}
              onClick={() => room.dispatch("words.setCategory", { scope: sc.id })}
            >
              {sc.emoji} {sc.name}
            </Chip>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- สรุปผลเมื่อจบเกม ----------
function WordsSummary({ state }: { state: WordsState }) {
  const room = useRoom();
  const sorted = [...state.units].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  const winners = top > 0 ? sorted.filter((u) => u.score === top) : [];
  const history = state.history ?? [];
  const totalCorrect = history.reduce((n, r) => n + r.correct, 0);
  const totalWords = history.reduce((n, r) => n + r.count, 0);
  const best = history.reduce<(typeof history)[number] | null>(
    (b, r) => (r.correct > (b?.correct ?? 0) ? r : b),
    null,
  );
  const bestUnit = best ? state.units.find((u) => u.id === best.unitId) : null;
  // ใครใบ้เก่งที่สุด (รวมคะแนนจากทุกรอบที่เป็นคนใบ้)
  const byGiver = new Map<string, number>();
  for (const r of history) byGiver.set(r.giver, (byGiver.get(r.giver) ?? 0) + r.correct);
  const mvp = [...byGiver.entries()].sort((a, b) => b[1] - a[1])[0];

  useEffect(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.45 } });
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-6">
      <div className="text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">สรุปผลใบ้คำ</h1>
        {winners.length > 0 ? (
          <p className="mt-2 text-xl">
            {winners.length > 1 ? "เสมอกัน! " : "ผู้ชนะ: "}
            {winners.map((u, i) => (
              <span key={u.id}>
                {i > 0 && " · "}
                <b style={{ color: u.color }}>{u.name}</b>
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-2 text-muted">ยังไม่มีใครทำคะแนนได้เลย 😅</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "รอบที่เล่น", value: history.length || state.roundNo },
          { label: "ทายถูก", value: totalCorrect },
          { label: "คำที่เปิด", value: totalWords },
        ].map((x) => (
          <div key={x.label} className="card-3d rounded-2xl bg-panel p-4">
            <div className="text-3xl font-extrabold tabular-nums text-sky">{x.value}</div>
            <div className="mt-1 text-xs text-muted">{x.label}</div>
          </div>
        ))}
      </div>

      <section className="card-3d rounded-3xl bg-panel p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Crown size={20} className="text-sun" /> อันดับ
        </h2>
        <ol className="flex flex-col gap-2">
          {sorted.map((u, i) => {
            const rank = sorted.findIndex((x) => x.score === u.score) + 1;
            return (
              <motion.li
                key={u.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-3 rounded-2xl p-3"
                style={{ backgroundColor: `${u.color}1f`, border: `1px solid ${u.color}66` }}
              >
                <span className="w-8 text-center text-2xl font-extrabold">
                  {u.score > 0 && rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg font-bold">{u.name}</span>
                <span className="text-3xl font-extrabold tabular-nums">{u.score}</span>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {(best || mvp) && (
        <section className="card-3d flex flex-col gap-3 rounded-3xl bg-panel p-5">
          {mvp && mvp[1] > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">🎤 คนใบ้ยอดเยี่ยม</span>
              <span className="font-bold">
                <PlayerName player={room.player(mvp[0])} /> <span className="text-mint">({mvp[1]} คำ)</span>
              </span>
            </div>
          )}
          {best && best.correct > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">🔥 รอบที่ดีที่สุด</span>
              <span className="font-bold">
                <span style={{ color: bestUnit?.color }}>{bestUnit?.name}</span>{" "}
                <span className="text-mint">+{best.correct}</span>
              </span>
            </div>
          )}
        </section>
      )}

      {room.isHost ? (
        <div className="flex flex-col gap-3">
          <Button tone="mint" size="lg" onClick={() => room.dispatch("words.resumeGame")}>
            ▶️ กลับไปเล่นต่อ (เก็บคะแนนไว้)
          </Button>
          <Button tone="sky" size="lg" onClick={() => room.dispatch("words.restart")}>
            🔄 เริ่มเกมใหม่ (ล้างคะแนน)
          </Button>
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("words.regroup")}>
            👥 กลับไปหน้าตั้งค่า / จัดทีมใหม่
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted">รอหัวหน้าห้องเลือกว่าจะเล่นต่อหรือไม่...</p>
      )}
    </main>
  );
}
