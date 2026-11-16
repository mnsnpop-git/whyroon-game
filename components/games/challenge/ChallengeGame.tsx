"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { Beer, Undo2 } from "lucide-react";
import { useState } from "react";
import { DECK_INFO } from "@/lib/challenge-cards";
import { useRoom } from "@/lib/client/room-store";
import { failCardChoices, heldForbidden } from "@/lib/engine/challenge";
import type { ChallengeActive, ChallengeDeck, ChallengeState } from "@/lib/types";
import { Avatar, PlayerName } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { formatTime, useRemaining } from "../../ui/Countdown";
import { Modal } from "../../ui/Modal";
import { HostMenu } from "../HostMenu";
import { ChallengeSummary } from "./ChallengeSummary";

/** โทนสีของแต่ละสำรับ (นีออนบนกระจกเข้ม) */
export const DECK_STYLE: Record<
  ChallengeDeck,
  { ring: string; glow: string; chip: string; button: string; text: string }
> = {
  challenge: {
    ring: "from-emerald-300 via-teal-300 to-sky-400",
    glow: "shadow-[0_30px_80px_-20px_rgba(16,185,129,0.55)]",
    chip: "border-emerald-300/30 bg-emerald-400/15 text-emerald-200",
    button: "glow-mint border-emerald-300/40 bg-gradient-to-br from-emerald-300 to-teal-500 text-ink",
    text: "text-emerald-300",
  },
  forbidden: {
    ring: "from-rose-300 via-pink-400 to-orange-300",
    glow: "shadow-[0_30px_80px_-20px_rgba(244,63,94,0.55)]",
    chip: "border-rose-300/30 bg-rose-400/15 text-rose-200",
    button:
      "border-rose-300/40 bg-gradient-to-br from-rose-300 to-orange-400 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-10px_rgba(244,63,94,0.7)]",
    text: "text-rose-300",
  },
};

export function ChallengeGame() {
  const room = useRoom();
  const s = room.snap.state as ChallengeState;
  const [failOpen, setFailOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);

  if (s.finishedAt) return <ChallengeSummary state={s} />;

  const turnId = s.order.length ? s.order[s.turn % s.order.length] : null;
  const nextId = s.order.length > 1 ? s.order[(s.turn + 1) % s.order.length] : null;
  const myTurn = turnId === room.me;
  const canDraw = myTurn || room.isHost;

  async function draw() {
    if (drawing) return;
    setDrawing(true);
    navigator.vibrate?.(30);
    // ไม่ส่งสำรับ → เซิร์ฟเวอร์สุ่มให้ว่าจะได้การ์ดคำสั่งหรือการ์ดห้าม
    await room.dispatch("challenge.draw", { expectedId: s.active?.id ?? 0 });
    setDrawing(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-56 pt-4">
      {/* แถบบน */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted">
          🎴 ท้าทาย &amp; ห้าม · จั่วไปแล้ว {s.drawn} ใบ
        </span>
        <div className="flex items-center gap-2">
          {room.isHost && (
            <Button tone="coral" size="sm" onClick={() => room.dispatch("challenge.finish")}>
              🏁 จบเกม
            </Button>
          )}
          <HostMenu
            actions={[
              ...(s.active
                ? [{ label: "🧹 ล้างการ์ดบนจอ (ยกเลิกกฎปัจจุบัน)", onClick: () => room.dispatch("challenge.clearCard") }]
                : []),
              ...(s.order.length > 1
                ? [
                    {
                      label: `⏭️ ข้ามตา ${room.player(turnId)?.nickname ?? ""}`,
                      onClick: () => room.dispatch("challenge.skip", { expectedTurn: s.turn }),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      {/* ตาของใคร */}
      <TurnBar turnId={turnId} nextId={nextId} myTurn={myTurn} />

      {/* การ์ดปัจจุบัน */}
      <ActiveCard active={s.active} />

      {/* ปุ่มทำพลาด */}
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setFailOpen(true)}
        className="btn-3d flex items-center justify-center gap-3 rounded-3xl border-amber-200/40 bg-gradient-to-br from-amber-200 to-sun py-5 text-2xl font-extrabold text-ink shadow-[0_14px_40px_-12px_rgba(242,201,76,0.7)]"
      >
        <span className="text-3xl">😵</span> ทำพลาด! <span className="text-base font-bold opacity-70">(ดื่ม 1 แก้ว)</span>
      </motion.button>

      <FailBoard state={s} turnId={turnId} />
      <ForbiddenByPlayer state={s} />
      <FailLog state={s} />

      {/* แถบจั่วการ์ด */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090d16]/70 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {canDraw ? (
            <>
              <motion.button
                type="button"
                disabled={drawing}
                animate={myTurn && !drawing ? { scale: [1, 1.025, 1] } : { scale: 1 }}
                transition={myTurn && !drawing ? { repeat: Infinity, duration: 1.4 } : undefined}
                whileHover={drawing ? undefined : { y: -2 }}
                whileTap={drawing ? undefined : { scale: 0.95 }}
                onClick={draw}
                className="btn-3d flex w-full items-center justify-center gap-4 rounded-3xl border-white/30 bg-gradient-to-r from-emerald-300 via-sky-300 to-rose-300 py-4 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_40px_-12px_rgba(56,189,248,0.7)]"
              >
                <span className="text-4xl leading-none">{drawing ? "🌀" : "🎴"}</span>
                <span className="text-left">
                  <span className="block text-2xl font-extrabold leading-tight">
                    {drawing ? "กำลังสุ่ม..." : myTurn ? "สุ่มจั่วการ์ด!" : `จั่วแทน ${room.player(turnId)?.nickname ?? ""}`}
                  </span>
                  <span className="block text-xs font-semibold opacity-70">
                    🎯 คำสั่ง {s.remaining.challenge} · 🚫 ห้าม {s.remaining.forbidden} ใบ — ได้แบบไหนลุ้นเอา!
                  </span>
                </span>
              </motion.button>
            </>
          ) : (
            <p className="py-4 text-center text-lg font-semibold text-muted">
              ⏳ รอ {room.player(turnId)?.emoji} {room.player(turnId)?.nickname ?? ""} จั่วการ์ด...
            </p>
          )}
        </div>
      </div>

      <FailModal open={failOpen} onClose={() => setFailOpen(false)} state={s} />
    </main>
  );
}

function TurnBar({ turnId, nextId, myTurn }: { turnId: string | null; nextId: string | null; myTurn: boolean }) {
  const room = useRoom();
  const turn = room.player(turnId);
  return (
    <div
      className={`card-3d flex items-center gap-4 rounded-3xl p-4 transition-colors ${
        myTurn ? "tint-sky" : "bg-panel"
      }`}
    >
      <motion.div
        key={turnId}
        initial={{ scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Avatar player={turn} size="lg" />
      </motion.div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">ตาของ</div>
        <div className="truncate text-2xl font-extrabold">
          {turn?.nickname ?? "-"}
          {myTurn && <span className="ml-1.5 text-base text-sky">(คุณ!)</span>}
        </div>
        {nextId && (
          <div className="mt-0.5 truncate text-sm text-white/60">
            ถัดไป: <PlayerName player={room.player(nextId)} />
          </div>
        )}
      </div>
    </div>
  );
}

/** การ์ดคำสั่ง: คนถือเลือก "รับคำท้า" หรือ "ยอมดื่ม" (= ทำพลาด +1) */
function ChallengeResponse({ active }: { active: ChallengeActive }) {
  const room = useRoom();
  const [busy, setBusy] = useState(false);
  const holder = room.player(active.by);
  const mine = active.by === room.me;

  if (active.response === "accepted") {
    return (
      <div className="relative mb-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-4 py-1.5 text-sm font-bold text-emerald-200">
          💪 {mine ? "คุณ" : holder?.nickname} รับคำท้าแล้ว!
        </span>
      </div>
    );
  }
  if (active.response === "drank") {
    return (
      <div className="relative mb-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/40 bg-amber-300/15 px-4 py-1.5 text-sm font-bold text-amber-100">
          🍺 {mine ? "คุณ" : holder?.nickname} ยอมดื่มแทน · พลาด +1
        </span>
      </div>
    );
  }

  if (!mine && !room.isHost) {
    return (
      <p className="relative mb-4 animate-pulse text-center text-sm font-semibold text-white/70">
        ⏳ รอ {holder?.nickname ?? "คนถือการ์ด"} เลือก: รับคำท้า หรือ ยอมดื่ม
      </p>
    );
  }

  async function respond(choice: "accept" | "drink") {
    if (busy) return;
    setBusy(true);
    navigator.vibrate?.(choice === "drink" ? [40, 40, 80] : 30);
    const ok = await room.dispatch("challenge.respond", { cardId: active.id, choice });
    setBusy(false);
    if (ok && choice === "drink") {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 }, colors: ["#f2c94c", "#fb7185", "#ffffff"] });
    }
  }

  return (
    <div className="relative mb-4">
      {!mine && (
        <p className="mb-2 text-center text-xs text-muted">เลือกแทน {holder?.nickname ?? "คนถือการ์ด"} (หัวหน้าห้อง)</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          disabled={busy}
          whileTap={{ scale: 0.95 }}
          onClick={() => respond("accept")}
          className={`btn-3d rounded-2xl py-3.5 text-lg font-extrabold ${DECK_STYLE.challenge.button}`}
        >
          💪 รับคำท้า
        </motion.button>
        <motion.button
          type="button"
          disabled={busy}
          whileTap={{ scale: 0.95 }}
          onClick={() => respond("drink")}
          className="btn-3d rounded-2xl border-amber-200/40 bg-gradient-to-br from-amber-200 to-sun py-3.5 text-lg font-extrabold text-ink"
        >
          🍺 ยอมดื่ม
          <span className="block text-[11px] font-semibold opacity-70">นับเป็นทำพลาด +1</span>
        </motion.button>
      </div>
      {active.seconds ? (
        <p className="mt-2 text-center text-xs text-muted">⏱️ รับคำท้าแล้วเริ่มจับเวลา {active.seconds} วินาที</p>
      ) : null}
    </div>
  );
}

function CountdownRing({ active }: { active: ChallengeActive }) {
  const left = useRemaining(active.endsAt, 100);
  if (!active.endsAt) return null;
  const total = Math.max(1, active.endsAt - (active.startedAt ?? active.at));
  const pct = Math.min(1, left / total);
  const r = 26;
  const c = 2 * Math.PI * r;
  const done = left <= 0;
  const warn = !done && left <= 5000;
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={done ? "#fb7185" : warn ? "#f2c94c" : "#34d399"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 100ms linear" }}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums ${
            warn ? "animate-pulse text-sun" : done ? "text-rose-300" : ""
          }`}
        >
          {done ? "0:00" : formatTime(left)}
        </span>
      </div>
      <span className={`text-sm font-semibold ${done ? "text-rose-300" : "text-white/70"}`}>
        {done ? "⏰ หมดเวลา! ทำสำเร็จไหม?" : "เวลาทำภารกิจ"}
      </span>
    </div>
  );
}

function ActiveCard({ active }: { active: ChallengeActive | null }) {
  const room = useRoom();
  if (!active) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/15 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
        <div className="text-6xl">🎴</div>
        <div className="mt-3 text-2xl font-extrabold">ยังไม่มีการ์ดบนโต๊ะ</div>
        <p className="mt-1 text-muted">จั่วใบแรกได้เลย! การ์ดจะมีผลจนกว่าจะมีคนจั่วใบใหม่</p>
      </div>
    );
  }
  const st = DECK_STYLE[active.deck];
  const info = DECK_INFO[active.deck];
  const holder = room.player(active.by);
  return (
    <div className="[perspective:1200px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ rotateY: -100, scale: 0.85, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          exit={{ rotateY: 90, scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 18 }}
          className={`rounded-[2rem] bg-gradient-to-br p-[2px] ${st.ring} ${st.glow}`}
        >
          <div className="relative overflow-hidden rounded-[calc(2rem-2px)] bg-[#0c1220]/95 p-6">
            {/* แสงฟุ้งในการ์ด */}
            <div
              className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br opacity-25 blur-3xl ${st.ring}`}
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${st.chip}`}>
                {info.emoji} {info.name}
              </span>
              <span className="text-xs font-semibold text-white/50">ใบที่ {active.id}</span>
            </div>

            <p className="relative my-7 text-center text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl">
              {active.text}
            </p>

            {active.deck === "challenge" && <ChallengeResponse active={active} />}
            <CountdownRing key={`${active.id}-${active.startedAt ?? 0}`} active={active} />

            <div className="relative mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar player={holder} size="sm" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">ถือการ์ด</div>
                  <div className="truncate font-bold">
                    {holder?.nickname ?? "-"}
                    {active.by === room.me && <span className="ml-1 text-xs text-sky">(คุณ)</span>}
                  </div>
                </div>
              </div>
              <span className={`shrink-0 text-right text-xs font-bold ${st.text}`}>
                {active.deck === "challenge" ? `ภารกิจของ ${holder?.nickname ?? "-"}` : "ทุกคนต้องระวัง!"}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FailBoard({ state, turnId }: { state: ChallengeState; turnId: string | null }) {
  const room = useRoom();
  const ids = Array.from(new Set([...state.order, ...Object.keys(state.fails)])).filter(
    (id) => state.order.includes(id) || (state.fails[id] ?? 0) > 0,
  );
  const sorted = ids.sort((a, b) => (state.fails[b] ?? 0) - (state.fails[a] ?? 0));
  const top = state.fails[sorted[0]] ?? 0;
  return (
    <section className="card-3d rounded-3xl bg-panel p-5">
      <h2 className="mb-4 flex items-center justify-between text-lg font-bold">
        <span className="flex items-center gap-2">
          <Beer size={20} className="text-sun" /> สถิติทำพลาด
        </span>
        <span className="text-xs font-medium text-muted">ตัวเลข = พลาด (แก้ว)</span>
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {sorted.map((id) => {
          const n = state.fails[id] ?? 0;
          const p = room.player(id);
          const inQueue = state.order.includes(id);
          return (
            <motion.li
              layout
              key={id}
              className={`flex items-center gap-2 rounded-2xl border p-2.5 ${
                id === turnId ? "border-sky/40 bg-sky/10" : "border-white/5 bg-white/[0.04]"
              } ${inQueue ? "" : "opacity-50"}`}
            >
              <span className="text-2xl">{p?.emoji ?? "❔"}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold">
                <span className="block truncate">
                  {p?.nickname ?? "?"}
                  {n > 0 && n === top && <span className="ml-1">👑</span>}
                </span>
                {(state.caused?.[id] ?? 0) > 0 && (
                  <span className="block text-[11px] font-medium text-sky/70">😈 ทำให้พลาด {state.caused![id]}</span>
                )}
              </span>
              <motion.span
                key={n}
                initial={{ scale: 1.8, color: "#fb7185" }}
                animate={{ scale: 1, color: n > 0 ? "#f2c94c" : "#94a3b8" }}
                className="text-xl font-extrabold tabular-nums"
              >
                {n}
              </motion.span>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/** log เล็กๆ: การ์ดห้ามใบล่าสุดที่แต่ละคนจั่ว */
function ForbiddenByPlayer({ state }: { state: ChallengeState }) {
  const room = useRoom();
  const rows = Object.entries(heldForbidden(state)).sort((a, b) => b[1].id - a[1].id);
  if (rows.length === 0) return null;
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold text-muted">🚫 การ์ดห้ามล่าสุดของแต่ละคน</h3>
      <ul className="flex flex-col gap-1">
        {rows.map(([id, c]) => {
          const current = state.active?.id === c.id;
          return (
            <li key={id} className="flex items-baseline gap-2 text-xs">
              <span className="shrink-0 text-white/60">
                {room.player(id)?.emoji} {room.player(id)?.nickname ?? "?"}
              </span>
              <span className={`min-w-0 flex-1 truncate ${current ? "text-rose-200/80" : "text-white/40"}`}>
                {c.text}
              </span>
              {current && <span className="shrink-0 text-[10px] text-rose-300/70">● ใช้อยู่</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FailLog({ state }: { state: ChallengeState }) {
  const room = useRoom();
  const recent = state.failLog.slice(0, 5);
  if (recent.length === 0) return null;
  return (
    <section className="card-3d rounded-3xl bg-panel p-5">
      <h2 className="mb-3 text-lg font-bold">🕒 ทำพลาดล่าสุด</h2>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {recent.map((f) => {
            const canUndo = f.by === room.me || room.isHost;
            return (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] p-2.5 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <b>
                    <PlayerName player={room.player(f.player)} />
                  </b>{" "}
                  <span className="text-sun">+1 🍺</span>
                  {f.drank && <span className="ml-1 text-xs text-amber-200/70">(ยอมดื่ม)</span>}
                  {f.text && (
                    <span className="block truncate text-xs text-white/50">
                      {f.deck ? DECK_INFO[f.deck].emoji : ""} {f.text}
                    </span>
                  )}
                </span>
                {canUndo && (
                  <button
                    type="button"
                    aria-label="ยกเลิกรายการนี้"
                    title="ยกเลิกรายการนี้"
                    onClick={() => room.dispatch("challenge.undoFail", { logId: f.id })}
                    className="rounded-xl p-2 text-muted transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Undo2 size={16} />
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function FailModal({ open, onClose, state }: { open: boolean; onClose: () => void; state: ChallengeState }) {
  return (
    <Modal open={open} onClose={onClose} title="😵 ใครทำพลาด?">
      {/* อยู่ใน Modal → สร้างใหม่ทุกครั้งที่เปิด ค่าที่เลือกไว้จึงรีเซ็ตกลับเป็นการ์ดใบปัจจุบัน */}
      <FailPicker state={state} onDone={onClose} />
    </Modal>
  );
}

function FailPicker({ state, onDone }: { state: ChallengeState; onDone: () => void }) {
  const room = useRoom();
  const [busy, setBusy] = useState(false);
  // การ์ดล่าสุดที่เลือกได้ (ใบบนจอขึ้นก่อน)
  // ใบบนจอ + การ์ดห้ามที่ทุกคนถืออยู่ล่าสุด
  const cards = failCardChoices(state);
  const [cardId, setCardId] = useState<number | null>(state.active?.id ?? cards[0]?.id ?? null);
  const card = cards.find((c) => c.id === cardId) ?? null;

  const holder = card?.deck === "challenge" ? card.by : null;
  // คนถือการ์ดคำสั่งขึ้นก่อน แล้วตามด้วยคิว และคนอื่นๆ ในห้อง
  const ids = Array.from(
    new Set([...(holder ? [holder] : []), ...state.order, ...room.players.map((p) => p.id)]),
  ).filter((id) => room.player(id)?.status === "active");

  async function report(id: string) {
    if (busy) return;
    setBusy(true);
    const ok = await room.dispatch("challenge.fail", { playerId: id, ...(card ? { cardId: card.id } : {}) });
    setBusy(false);
    if (ok) {
      navigator.vibrate?.([40, 40, 80]);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 }, colors: ["#f2c94c", "#fb7185", "#ffffff"] });
      onDone();
    }
  }

  return (
    <>
      {cards.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 text-sm font-semibold text-muted">พลาดเพราะการ์ดใบไหน?</div>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="เลือกการ์ด">
            {cards.map((c) => {
              const selected = c.id === cardId;
              const current = c.id === state.active?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCardId(c.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    selected
                      ? c.deck === "challenge"
                        ? "border-emerald-300/60 bg-emerald-400/15"
                        : "border-rose-300/60 bg-rose-400/15"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-white" : "border-white/30"
                    }`}
                  >
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug">
                      {DECK_INFO[c.deck].emoji} {c.text}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/50">
                      {current ? "ใบบนจอตอนนี้ · " : ""}
                      {c.deck === "challenge"
                        ? `ภารกิจของ ${room.player(c.by)?.nickname ?? "?"}`
                        : `${room.player(c.by)?.emoji ?? ""} ${room.player(c.by)?.nickname ?? "?"} ถืออยู่`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-2 text-sm font-semibold text-muted">ใครทำพลาด?</div>
      <div className="grid grid-cols-3 gap-2">
        {ids.map((id) => {
          const p = room.player(id);
          return (
            <motion.button
              key={id}
              type="button"
              disabled={busy}
              whileTap={{ scale: 0.92 }}
              onClick={() => report(id)}
              className={`btn-3d relative flex flex-col items-center rounded-2xl p-3 ${
                id === holder ? "border-sun/50 bg-sun/15" : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="text-4xl">{p?.emoji ?? "❔"}</span>
              <span className="mt-1 w-full truncate text-sm font-semibold">
                {p?.nickname}
                {id === room.me && " (คุณ)"}
              </span>
              {id === holder && (
                <span className="absolute -right-1 -top-2 rounded-full bg-sun px-1.5 text-[10px] font-bold text-ink">
                  ถือการ์ด
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted">แตะชื่อคนที่ทำพลาด → ดื่ม 1 แก้ว และบันทึกสถิติ</p>
    </>
  );
}
