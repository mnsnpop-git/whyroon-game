"use client";

import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Pause, Play } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { SPY_LOCATIONS } from "@/lib/spy-locations";
import type { SpySecret, SpyState } from "@/lib/types";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { formatTime, useDeadline, useRemaining } from "../../ui/Countdown";
import { Modal } from "../../ui/Modal";
import { HostMenu } from "../HostMenu";
import { SpySummary } from "./SpySummary";

export function SpyGame() {
  const room = useRoom();
  const s = room.snap.state as SpyState;
  const secret = room.snap.secret?.kind === "spy" ? (room.snap.secret as SpySecret) : null;
  const inRound = s.order.includes(room.me);

  // หมดเวลา → ช่วยกันแจ้ง (หัวหน้าห้องก่อน คนอื่นตามมาเผื่อหัวหน้าหลุด)
  const running = s.phase === "playing" && s.pausedAt === null && !s.accusation;
  useDeadline(running ? s.endsAt : null, `${s.round}-${s.endsAt}`, () => room.dispatch("spy.timeout"), room.isHost ? 200 : 2000);

  if (s.phase === "ended") return <SpySummary state={s} />;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-40 pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted">
          🕵️ รอบที่ {s.round} · สายลับ {s.spyCount} คน
        </span>
        <HostMenu
          actions={[
            s.pausedAt === null
              ? { label: "⏸️ หยุดเวลาชั่วคราว", onClick: () => room.dispatch("spy.pause") }
              : { label: "▶️ เดินเวลาต่อ", onClick: () => room.dispatch("spy.resume") },
            { label: "🔍 เฉลยเลย (ไม่มีผู้ชนะ)", tone: "coral", onClick: () => room.dispatch("spy.reveal") },
          ]}
        />
      </div>

      <SpyTimer state={s} />
      {/* key = รอบ → เริ่มรอบใหม่การ์ดกลับไปซ่อนเสมอ (กันบทบาทใหม่โผล่บนจอเอง) */}
      <RoleCard key={`role-${s.round}`} secret={secret} inRound={inRound} />

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <Avatar player={room.player(s.firstAsker)} size="sm" />
        <p className="min-w-0 flex-1 text-sm">
          🎤 <b>{room.player(s.firstAsker)?.nickname ?? "?"}</b> เริ่มถามก่อน แล้วคนที่ถูกถามเป็นคนถามต่อ
        </p>
      </div>

      {s.lastVote && <LastVote state={s} />}

      <LocationBoard key={`loc-${s.round}`} />

      <ActionBar state={s} secret={secret} inRound={inRound} />
      <AccusationModal state={s} />
    </main>
  );
}

function SpyTimer({ state }: { state: SpyState }) {
  const room = useRoom();
  const live = useRemaining(state.pausedAt === null ? state.endsAt : null, 250);
  const left = state.pausedAt !== null ? Math.max(0, state.endsAt - state.pausedAt) : live;
  const total = Math.max(1, state.endsAt - state.startsAt);
  const warn = state.pausedAt === null && left <= 30_000;
  return (
    <section className={`card-3d rounded-[2rem] p-5 text-center ${warn ? "tint-rose" : "bg-panel"}`}>
      <div className="flex items-center justify-center gap-3">
        <motion.span
          key={warn ? Math.ceil(left / 1000) : "calm"}
          initial={warn ? { scale: 1.2 } : false}
          animate={{ scale: 1 }}
          className={`text-6xl font-extrabold tabular-nums tracking-tight ${warn ? "text-rose-300" : ""}`}
        >
          {formatTime(left)}
        </motion.span>
        {room.isHost && !state.accusation && (
          <button
            type="button"
            aria-label={state.pausedAt === null ? "หยุดเวลา" : "เดินเวลาต่อ"}
            onClick={() => room.dispatch(state.pausedAt === null ? "spy.pause" : "spy.resume")}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
          >
            {state.pausedAt === null ? <Pause size={22} /> : <Play size={22} />}
          </button>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${warn ? "bg-rose-400" : "bg-gradient-to-r from-violet to-sky"}`}
          style={{ width: `${Math.min(100, (left / total) * 100)}%` }}
        />
      </div>
      {state.pausedAt !== null && (
        <div className="mt-2 text-sm font-semibold text-sun">
          {state.accusation ? "⏸️ หยุดเวลาระหว่างโหวต" : "⏸️ หัวหน้าห้องหยุดเวลาไว้"}
        </div>
      )}
    </section>
  );
}

/** การ์ดบทบาท: ซ่อนไว้ก่อน แตะเพื่อดู (กันคนข้างๆ แอบมองจอ) */
function RoleCard({ secret, inRound }: { secret: SpySecret | null; inRound: boolean }) {
  const [show, setShow] = useState(false);
  if (!inRound || !secret) {
    return (
      <div className="card-3d rounded-[2rem] bg-panel p-6 text-center text-muted">
        👀 คุณดูอยู่ข้างสนาม — รอบหน้าจะได้เล่นด้วย
      </div>
    );
  }
  const loc = secret.location !== null ? SPY_LOCATIONS[secret.location] : null;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => setShow((v) => !v)}
      className={`relative w-full overflow-hidden rounded-[2rem] p-[2px] text-left ${
        secret.spy
          ? "bg-gradient-to-br from-fuchsia-400 via-rose-400 to-orange-300 shadow-[0_30px_80px_-24px_rgba(232,121,249,0.6)]"
          : "bg-gradient-to-br from-sky-300 via-violet-400 to-fuchsia-300 shadow-[0_30px_80px_-24px_rgba(139,92,246,0.55)]"
      }`}
    >
      <div className="rounded-[calc(2rem-2px)] bg-[#0c1220]/95 p-6 text-center">
        <AnimatePresence mode="wait" initial={false}>
          {show ? (
            <motion.div key="on" initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              {secret.spy ? (
                <>
                  <div className="text-6xl">🕵️</div>
                  <div className="mt-2 text-3xl font-extrabold leading-tight text-fuchsia-200">คุณคือสายลับ!</div>
                  <div className="text-lg font-bold text-white/70">(Spy)</div>
                  <p className="mt-3 text-sm text-white/60">
                    เนียนเข้าไว้ ฟังคำถาม-คำตอบแล้วเดาว่าที่นี่คือที่ไหน ทายถูกชนะทันที!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-200/80">สถานที่ลับ</div>
                  <div className="mt-1 text-5xl">{loc?.emoji}</div>
                  <div className="mt-1 text-3xl font-extrabold">{loc?.name}</div>
                  <div className="mt-4 inline-block rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
                    <span className="text-xs text-white/60">บทบาทของคุณ</span>
                    <div className="text-xl font-bold">{secret.role}</div>
                  </div>
                </>
              )}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40">
                <EyeOff size={14} /> แตะเพื่อซ่อน
              </div>
            </motion.div>
          ) : (
            <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6">
              <div className="text-5xl">🃏</div>
              <div className="mt-2 text-2xl font-extrabold">แตะเพื่อดูบทบาทของคุณ</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/50">
                <Eye size={16} /> อย่าให้คนข้างๆ เห็นนะ!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

function LastVote({ state }: { state: SpyState }) {
  const room = useRoom();
  const v = state.lastVote!;
  return (
    <div className="tint-sky rounded-2xl p-3 text-center text-sm">
      ❎ โหวตจับ <b>{room.player(v.target)?.nickname ?? "?"}</b> ไม่ผ่าน (เห็นด้วย {v.yes} · ไม่เห็นด้วย {v.no}) — เล่นต่อ!
    </div>
  );
}

/** รายชื่อสถานที่ทั้งหมด แตะเพื่อขีดฆ่าที่ตัดทิ้งแล้ว (จำไว้เฉพาะเครื่องเรา) */
function LocationBoard() {
  const [crossed, setCrossed] = useState<Set<number>>(new Set());
  return (
    <section className="card-3d rounded-3xl bg-panel p-4">
      <h3 className="mb-1 text-sm font-bold text-white/85">🗺️ สถานที่ที่เป็นไปได้</h3>
      <p className="mb-3 text-xs text-muted">แตะเพื่อขีดฆ่าที่คิดว่าไม่ใช่ (เห็นแค่เครื่องคุณ)</p>
      <div className="grid grid-cols-2 gap-1.5">
        {SPY_LOCATIONS.map((l, i) => {
          const off = crossed.has(i);
          return (
            <button
              key={l.name}
              type="button"
              onClick={() =>
                setCrossed((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition ${
                off ? "border-white/5 bg-transparent text-white/25 line-through" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              <span>{l.emoji}</span>
              <span className="min-w-0 truncate font-semibold">{l.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ActionBar({ state, secret, inRound }: { state: SpyState; secret: SpySecret | null; inRound: boolean }) {
  const room = useRoom();
  const [accuse, setAccuse] = useState(false);
  const [guess, setGuess] = useState(false);
  if (!inRound) return null;
  const used = state.accusedBy.includes(room.me);
  const blocked = !!state.accusation || state.pausedAt !== null;
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090d16]/75 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className={`mx-auto grid max-w-md gap-3 ${secret?.spy ? "grid-cols-2" : "grid-cols-1"}`}>
          <Button tone="coral" size="lg" disabled={used || blocked} onClick={() => setAccuse(true)}>
            🫵 {used ? "ใช้สิทธิ์ชี้แล้ว" : "จับผิดสายลับ!"}
          </Button>
          {secret?.spy && (
            <Button tone="violet" size="lg" disabled={blocked} onClick={() => setGuess(true)}>
              📍 ทายสถานที่
            </Button>
          )}
        </div>
      </div>
      <AccusePicker open={accuse} onClose={() => setAccuse(false)} state={state} />
      <GuessLocation open={guess} onClose={() => setGuess(false)} />
    </>
  );
}

function AccusePicker({ open, onClose, state }: { open: boolean; onClose: () => void; state: SpyState }) {
  const room = useRoom();
  const [busy, setBusy] = useState(false);
  const ids = state.order.filter((id) => id !== room.me && room.player(id)?.status === "active");
  return (
    <Modal open={open} onClose={onClose} title="🫵 ใครคือสายลับ?">
      <p className="mb-4 text-sm text-muted">
        ชี้ได้คนละ 1 ครั้งต่อรอบ · ทุกคนจะโหวตว่าเห็นด้วยไหม ถ้าเกินครึ่งเห็นด้วย = จับตัว (จับผิดคน สายลับชนะ!)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ids.map((id) => {
          const p = room.player(id);
          return (
            <motion.button
              key={id}
              type="button"
              disabled={busy}
              whileTap={{ scale: 0.92 }}
              onClick={async () => {
                setBusy(true);
                const ok = await room.dispatch("spy.accuse", { playerId: id });
                setBusy(false);
                if (ok) onClose();
              }}
              className="btn-3d flex flex-col items-center rounded-2xl border-white/10 bg-white/5 p-3 hover:bg-white/10"
            >
              <span className="text-4xl">{p?.emoji ?? "❔"}</span>
              <span className="mt-1 w-full truncate text-sm font-semibold">{p?.nickname}</span>
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}

function GuessLocation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const room = useRoom();
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={() => {
        setPick(null);
        onClose();
      }}
      title="📍 สถานที่ลับคือที่ไหน?"
    >
      <p className="mb-3 text-sm text-muted">ทายได้ครั้งเดียว — ถูกชนะทันที ผิดแพ้ทันที!</p>
      <div className="grid max-h-[50vh] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
        {SPY_LOCATIONS.map((l, i) => (
          <button
            key={l.name}
            type="button"
            onClick={() => setPick(i)}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-sm font-semibold transition ${
              pick === i ? "border-fuchsia-300/70 bg-fuchsia-400/20" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
            }`}
          >
            <span>{l.emoji}</span>
            <span className="min-w-0 truncate">{l.name}</span>
          </button>
        ))}
      </div>
      <Button
        tone="violet"
        size="lg"
        className="mt-4 w-full"
        disabled={pick === null || busy}
        onClick={async () => {
          if (pick === null) return;
          setBusy(true);
          await room.dispatch("spy.guessLocation", { location: pick });
          setBusy(false);
          onClose();
        }}
      >
        {pick === null ? "เลือกสถานที่ก่อน" : `ยืนยัน: ${SPY_LOCATIONS[pick].name}`}
      </Button>
    </Modal>
  );
}

/** หน้าต่างโหวตจับสายลับ — เด้งขึ้นทุกเครื่องพร้อมกัน */
function AccusationModal({ state }: { state: SpyState }) {
  const room = useRoom();
  const acc = state.accusation;
  const [busy, setBusy] = useState(false);
  if (!acc) return null;
  const voters = state.order.filter((id) => id !== acc.target && room.player(id)?.status === "active");
  const yes = voters.filter((id) => acc.votes[id] === true).length;
  const no = voters.filter((id) => acc.votes[id] === false).length;
  const need = Math.floor(voters.length / 2) + 1;
  const canVote = voters.includes(room.me);
  const mine = acc.votes[room.me];

  async function vote(agree: boolean) {
    setBusy(true);
    await room.dispatch("spy.vote", { accusationId: acc!.id, agree });
    setBusy(false);
  }

  return (
    <Modal open onClose={() => {}} title="🚨 โหวตจับสายลับ!">
      <div className="text-center">
        <p className="text-sm text-white/70">
          <b>{room.player(acc.by)?.nickname}</b> ชี้ว่า
        </p>
        <div className="my-3 flex flex-col items-center">
          <Avatar player={room.player(acc.target)} size="xl" />
          <div className="mt-2 text-2xl font-extrabold">{room.player(acc.target)?.nickname} คือสายลับ!</div>
        </div>
        <div className="mb-4 flex justify-center gap-3 text-sm font-bold">
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-200">👍 {yes}</span>
          <span className="rounded-full bg-rose-400/15 px-3 py-1 text-rose-200">👎 {no}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">ต้องการ {need} เสียง</span>
        </div>
        {room.me === acc.target ? (
          <p className="font-semibold text-sun">คุณถูกชี้! แก้ตัวด้วยปากเปล่าเลย 😅</p>
        ) : canVote ? (
          <div className="grid grid-cols-2 gap-3">
            <Button tone="mint" size="lg" disabled={busy || mine === true} onClick={() => vote(true)}>
              👍 ใช่ จับเลย
            </Button>
            <Button tone="coral" size="lg" disabled={busy || mine === false} onClick={() => vote(false)}>
              👎 ไม่ใช่
            </Button>
          </div>
        ) : (
          <p className="text-muted">รอผลโหวต...</p>
        )}
        {mine !== undefined && room.me !== acc.by && (
          <p className="mt-2 text-xs text-muted">คุณโหวต {mine ? "เห็นด้วย" : "ไม่เห็นด้วย"} — เปลี่ยนใจได้จนกว่าผลจะออก</p>
        )}
        {(room.me === acc.by || room.isHost) && (
          <button
            type="button"
            onClick={() => room.dispatch("spy.cancelVote")}
            className="mt-4 text-sm text-muted underline-offset-4 hover:underline"
          >
            ยกเลิกการชี้ตัว
          </button>
        )}
      </div>
    </Modal>
  );
}
