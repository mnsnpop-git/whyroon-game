"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Minus, Pencil, Plus, Timer, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CARD_RULES, DRINK_PICK, DRINK_REASONS } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import type { DrinkEvent, OhanaDraw, OhanaState } from "@/lib/types";
import { Avatar, PlayerName } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { formatTime, useRemaining } from "../../ui/Countdown";
import { Modal } from "../../ui/Modal";
import { HostMenu } from "../HostMenu";
import { OhanaSummary } from "./OhanaSummary";
import { CardBack, CardFace, FlipCard } from "./PlayingCard";

export function OhanaGame() {
  const room = useRoom();
  const s = room.snap.state as OhanaState;
  const turnId = s.order[s.turn];
  const nextId = s.order.length > 1 ? s.order[(s.turn + 1) % s.order.length] : turnId;
  const myTurn = turnId === room.me;
  const canDraw = (myTurn || room.isHost) && s.remaining > 0;

  // เปิด popup อัตโนมัติเมื่อมีไพ่ใบใหม่
  const [seen, setSeen] = useState(s.current?.id ?? 0);
  const [openId, setOpenId] = useState<number | null>(null);
  if (s.current && s.current.id > seen) {
    setSeen(s.current.id);
    setOpenId(s.current.id);
  }
  const openDraw = openId !== null ? s.history.find((h) => h.id === openId) ?? null : null;

  const [drawing, setDrawing] = useState(false);
  const [editRule, setEditRule] = useState(false);

  useEffect(() => {
    if (myTurn && "vibrate" in navigator) navigator.vibrate?.([80, 60, 80]);
  }, [myTurn]);

  useEffect(() => {
    if (s.remaining === 0) {
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    }
  }, [s.remaining]);

  async function draw() {
    if (!canDraw || drawing) return;
    setDrawing(true);
    await room.dispatch("ohana.draw", { expectedId: s.current?.id ?? 0 });
    setDrawing(false);
  }

  if (s.finishedAt) return <OhanaSummary state={s} />;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-64 pt-3">
      {/* แถบบน: ตาของใคร */}
      <div className="card-3d mb-4 rounded-3xl bg-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-muted">🃏 Doraemon</span>
          <div className="flex items-center gap-2">
            {room.isHost && (
              <Button tone="coral" size="sm" onClick={() => room.dispatch("ohana.finish")}>
                🏁 จบเกม
              </Button>
            )}
            <HostMenu
              actions={[
                { label: "🏁 จบเกม ดูสรุปการดื่ม", tone: "sun", onClick: () => room.dispatch("ohana.finish") },
                { label: "🔄 สับไพ่ใหม่ทั้งกอง", tone: "sun", onClick: () => room.dispatch("ohana.reshuffle") },
              ]}
            />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Avatar player={room.player(turnId)} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted">ตาของ</div>
            <div className="truncate text-2xl font-extrabold">
              {room.player(turnId)?.nickname ?? "-"}
              {myTurn && <span className="ml-2 text-base text-sun">(คุณ!)</span>}
            </div>
            <div className="truncate text-sm text-muted">
              คนถัดไป: <PlayerName player={room.player(nextId)} className="font-semibold text-white" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">ไพ่เหลือ</div>
            <div className="text-2xl font-extrabold tabular-nums text-sun">
              {s.remaining}/{s.total}
            </div>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel2">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky to-mint shadow-[0_0_12px_rgba(56,189,248,0.6)]"
            animate={{ width: `${(s.remaining / s.total) * 100}%` }}
          />
        </div>
      </div>

      <RestBanner state={s} />

      {/* กองไพ่ 3D */}
      <div className="relative my-4 flex flex-col items-center">
        {s.remaining > 0 ? (
          <motion.button
            type="button"
            onClick={draw}
            disabled={!canDraw || drawing}
            whileTap={canDraw ? { scale: 0.94, rotate: -2 } : undefined}
            animate={myTurn ? { y: [0, -8, 0] } : { y: 0 }}
            transition={myTurn ? { repeat: Infinity, duration: 1.4 } : undefined}
            className="relative h-60 w-44 [perspective:800px] disabled:cursor-not-allowed"
            aria-label="จั่วไพ่"
          >
            {[3, 2, 1].map((i) =>
              s.remaining > i ? (
                <div
                  key={i}
                  className="absolute inset-0"
                  style={{ transform: `translate(${i * 4}px, ${i * 4}px) rotate(${i * 1.5}deg)` }}
                >
                  <CardBack className="brightness-75" />
                </div>
              ) : null,
            )}
            <div className="absolute inset-0 [transform:rotateX(8deg)]">
              <CardBack />
            </div>
          </motion.button>
        ) : (
          <div className="flex h-60 w-44 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.03] text-center backdrop-blur-xl">
            <div className="text-5xl">🫗</div>
            <div className="mt-2 text-lg font-bold">ไพ่หมดกองแล้ว!</div>
          </div>
        )}

        <div className="mt-6 w-full">
          {s.remaining > 0 ? (
            <>
              <Button
                tone={canDraw ? "mint" : "ghost"}
                size="xl"
                className="w-full"
                disabled={!canDraw || drawing}
                onClick={draw}
              >
                {canDraw
                  ? myTurn
                    ? "🃏 จั่วไพ่!"
                    : `🃏 จั่วแทน ${room.player(turnId)?.nickname ?? ""}`
                  : `รอ ${room.player(turnId)?.nickname ?? ""} จั่ว...`}
              </Button>
              {room.isHost && s.order.length > 1 && (
                <SkipTurn turn={s.turn} name={room.player(turnId)?.nickname ?? ""} />
              )}
            </>
          ) : room.isHost ? (
            <div className="flex flex-col gap-2">
              <Button tone="coral" size="xl" className="w-full" onClick={() => room.dispatch("ohana.finish")}>
                🏁 จบเกม ดูสรุปการดื่ม
              </Button>
              <Button tone="sun" size="lg" className="w-full" onClick={() => room.dispatch("ohana.reshuffle")}>
                🔄 สับไพ่เล่นต่อ (เก็บยอดดื่มไว้)
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted">รอหัวหน้าห้องสับไพ่ใหม่...</p>
          )}
        </div>
      </div>

      {/* ไพ่ล่าสุด */}
      {s.history.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted">ไพ่ที่เปิดล่าสุด (แตะเพื่อดูกติกา)</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {s.history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setOpenId(h.id)}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <div className="h-20 w-14">
                  <CardFace card={h.card} small />
                </div>
                <span className="max-w-16 truncate text-xs text-muted">
                  {room.player(h.by)?.emoji} {room.player(h.by)?.nickname}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <DrinkBoard state={s} />

      <StatusBar state={s} onEditRule={() => setEditRule(true)} />

      <CardModal draw={openDraw} state={s} onClose={() => setOpenId(null)} onEditRule={() => setEditRule(true)} />
      <RuleModal open={editRule} state={s} onClose={() => setEditRule(false)} />
    </main>
  );
}

// ---------- ข้ามตา (หัวหน้าห้อง ต้องยืนยันก่อน) ----------
function SkipTurn({ turn, name }: { turn: number; name: string }) {
  const room = useRoom();
  const [confirmFor, setConfirmFor] = useState<number | null>(null);
  // ตาเปลี่ยนไปแล้ว → ปิดกล่องยืนยันเอง
  const confirming = confirmFor === turn;

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirmFor(turn)}
        className="mx-auto mt-2 block text-sm text-muted underline-offset-2 hover:text-white hover:underline"
      >
        ⏭️ ข้ามตา {name}
      </button>
    );
  }
  return (
    <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-panel2 p-2 text-sm">
      <span className="min-w-0 truncate">ข้ามตา {name} ใช่ไหม?</span>
      <Button tone="ghost" size="sm" onClick={() => setConfirmFor(null)}>
        ไม่
      </Button>
      <Button
        tone="coral"
        size="sm"
        onClick={async () => {
          await room.dispatch("ohana.skip", { expectedTurn: turn });
          setConfirmFor(null);
        }}
      >
        ข้ามเลย
      </Button>
    </div>
  );
}

// ---------- Popup ไพ่ ----------
function CardModal({
  draw,
  state,
  onClose,
  onEditRule,
}: {
  draw: OhanaDraw | null;
  state: OhanaState;
  onClose: () => void;
  onEditRule: () => void;
}) {
  const room = useRoom();
  if (!draw) return <Modal open={false}>{null}</Modal>;
  const rule = CARD_RULES[draw.card.rank];
  const mine = draw.by === room.me;
  const canAct = mine || room.isHost;
  const drawer = room.player(draw.by);
  const isK = draw.card.rank === "K";

  return (
    <Modal open onClose={onClose} className="!max-w-sm text-center">
      <div className="-mt-2 mb-2 text-base text-muted">
        <PlayerName player={drawer} className="font-bold text-white" /> จั่วได้
      </div>
      <div className="flex justify-center">
        <FlipCard key={draw.id} card={draw.card} />
      </div>

      <motion.div
        key={`r${draw.id}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-4"
      >
        <div className="text-5xl">{rule.icon}</div>
        {isK ? (
          <>
            <div className="mt-1 text-lg font-bold text-sun">K ใบที่ {(draw.kIndex ?? 0) + 1}</div>
            <div className="mt-1 text-3xl font-extrabold leading-snug">{draw.kRule}</div>
          </>
        ) : (
          <>
            <div className="mt-1 text-3xl font-extrabold leading-snug">{rule.title}</div>
            <div className="mt-1 text-lg text-white/80">{rule.detail}</div>
          </>
        )}

        {/* เลือกคนดื่ม / สรุปคนดื่ม */}
        {DRINK_PICK[draw.card.rank] ? (
          <DrinkPicker key={draw.id} draw={draw} state={state} canAct={canAct} />
        ) : (
          draw.drinkers && <DrinkerList ids={draw.drinkers} />
        )}

        {/* 7: บัดดี้ */}
        {draw.card.rank === "7" && (
          <div className="mt-4 rounded-2xl bg-panel2 p-3 text-left">
            {draw.needBuddyPick ? (
              canAct ? (
                <>
                  <p className="mb-2 font-bold">👯 เลือกบัดดี้ 1 คน</p>
                  <div className="grid grid-cols-2 gap-2">
                    {room.players
                      .filter((p) => p.id !== draw.by)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => room.dispatch("ohana.pickBuddy", { drawId: draw.id, target: p.id })}
                          className="btn-3d flex items-center gap-2 rounded-2xl border-sky/25 bg-sky/10 px-2.5 py-2.5 text-left font-semibold hover:bg-sky/20"
                        >
                          <span className="text-2xl">{p.emoji}</span>
                          <span className="truncate">{p.nickname}</span>
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <p className="text-center">⏳ รอ {drawer?.nickname} เลือกบัดดี้...</p>
              )
            ) : draw.buddyJoined ? (
              <p className="text-center font-bold text-mint">✨ {drawer?.nickname} เข้าวงบัดดี้อัตโนมัติ!</p>
            ) : null}
            {state.buddies.length > 0 && (
              <p className="mt-2 text-center text-sm">
                วงบัดดี้ตอนนี้:{" "}
                {state.buddies.map((id) => `${room.player(id)?.emoji ?? ""}${room.player(id)?.nickname ?? ""}`).join(" · ")}
              </p>
            )}
          </div>
        )}

        {/* 8: จับเวลาพัก */}
        {draw.card.rank === "8" && <RestControl state={state} />}

        {/* 9: มินิเกม */}
        {draw.card.rank === "9" && draw.miniGame && (
          <div className="mt-4 rounded-2xl bg-panel2 p-3">
            <p className="text-sm text-muted">ไอเดียมินิเกม</p>
            <p className="text-xl font-bold text-sun">🎲 {draw.miniGame}</p>
          </div>
        )}

        {/* 10: ตั้งกฎ */}
        {draw.card.rank === "10" && state.rule?.by === draw.by && (
          <div className="mt-4 rounded-2xl bg-panel2 p-3">
            {state.rule.text ? (
              <p className="text-xl font-bold">📜 {state.rule.text}</p>
            ) : (
              <p className="text-muted">ยังไม่ได้ตั้งกฎ</p>
            )}
            {canAct && (
              <Button tone="sun" className="mt-2 w-full" onClick={onEditRule}>
                <Pencil size={18} /> {state.rule.text ? "แก้ไขกฎ" : "ตั้งกฎเลย"}
              </Button>
            )}
          </div>
        )}

        {/* Q: แหม่ม */}
        {draw.card.rank === "Q" && (
          <p className="mt-4 rounded-2xl bg-pink/20 p-3 text-xl font-bold text-pink">
            🤐 ห้ามคุยกับ {drawer?.emoji} {drawer?.nickname}!
          </p>
        )}
      </motion.div>

      <Button tone="violet" size="lg" className="mt-5 w-full" onClick={onClose}>
        รับทราบ! 👍
      </Button>
    </Modal>
  );
}

// ---------- เลือกคนดื่ม ----------
function DrinkerList({ ids, amount = 1 }: { ids: string[]; amount?: number }) {
  const room = useRoom();
  return (
    <div className="mt-4 rounded-2xl bg-sun/15 p-3">
      <p className="mb-1.5 text-sm font-bold text-sun">🍺 คนที่ดื่ม คนละ {amount} แก้ว</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ids.map((id) => (
          <span key={id} className="rounded-lg bg-sun/25 px-2 py-0.5 font-semibold">
            {room.player(id)?.emoji} {room.player(id)?.nickname ?? "?"}
          </span>
        ))}
      </div>
    </div>
  );
}

function initialPick(draw: OhanaDraw, state: OhanaState): string[] {
  const cfg = DRINK_PICK[draw.card.rank]!;
  if (draw.drinkers) {
    return cfg.withDrawer ? draw.drinkers.filter((id) => id !== draw.by) : draw.drinkers;
  }
  if (cfg.neighbor) {
    const n = state.order.length;
    const idx = state.order.indexOf(draw.by);
    const id = idx >= 0 && n > 1 ? state.order[(idx + cfg.neighbor + n) % n] : null;
    if (id && id !== draw.by) return [id];
  }
  return [];
}

function DrinkPicker({ draw, state, canAct }: { draw: OhanaDraw; state: OhanaState; canAct: boolean }) {
  const room = useRoom();
  const cfg = DRINK_PICK[draw.card.rank]!;
  const [picked, setPicked] = useState(() => initialPick(draw, state));
  const [amount, setAmount] = useState(draw.drinkAmount ?? 1);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const drawer = room.player(draw.by);

  if (!draw.needDrinkPick && !editing) {
    return (
      <>
        {draw.drinkers && draw.drinkers.length > 0 ? (
          <DrinkerList ids={draw.drinkers} amount={draw.drinkAmount} />
        ) : (
          <p className="mt-4 text-muted">ไม่มีใครต้องดื่ม</p>
        )}
        {canAct && (
          <button type="button" onClick={() => setEditing(true)} className="mt-1 text-sm text-muted underline">
            แก้ไขคนดื่ม
          </button>
        )}
      </>
    );
  }

  if (!canAct) {
    return <p className="mt-4 rounded-2xl bg-panel2 p-3">⏳ รอ {drawer?.nickname} เลือกคนดื่ม...</p>;
  }

  const full = cfg.max > 0 && picked.length >= cfg.max;
  const ok = picked.length >= cfg.min && (cfg.max === 0 || picked.length <= cfg.max);
  const toggle = (id: string) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cfg.max === 1 ? [id] : full ? cur : [...cur, id],
    );

  return (
    <div className="mt-4 rounded-2xl bg-panel2 p-3 text-left">
      <p className="mb-2 font-bold">
        🍺 {cfg.label}
        {cfg.max > 1 && <span className="ml-1 text-sm font-normal text-muted">({picked.length}/{cfg.max})</span>}
      </p>
      {cfg.withDrawer && <p className="-mt-1 mb-2 text-sm text-muted">{drawer?.nickname} ดื่มด้วยอยู่แล้ว</p>}
      <div className="grid grid-cols-2 gap-2">
        {room.players
          .filter((p) => cfg.allowDrawer || p.id !== draw.by)
          .map((p) => {
            const on = picked.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.id)}
                disabled={!on && full && cfg.max !== 1}
                className={`flex items-center gap-2 rounded-2xl border-2 px-2 py-2 text-left font-semibold transition disabled:opacity-40 ${
                  on ? "border-sun bg-sun text-ink" : "border-line bg-panel"
                }`}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="truncate">{p.nickname}</span>
                {state.buddies.includes(p.id) && <span className="ml-auto text-sm">👯</span>}
              </button>
            );
          })}
      </div>
      {cfg.amount && <AmountStepper value={amount} onChange={setAmount} />}
      {picked.some((id) => state.buddies.includes(id)) && (
        <p className="mt-2 text-sm text-pink">👯 มีคนในวงบัดดี้ — ทั้งวงดื่มตามด้วย</p>
      )}
      <Button
        tone="sun"
        className="mt-3 w-full"
        disabled={!ok || saving}
        onClick={async () => {
          setSaving(true);
          if (await room.dispatch("ohana.pickDrinkers", { drawId: draw.id, targets: picked, amount })) setEditing(false);
          setSaving(false);
        }}
      >
        {picked.length === 0 ? "ไม่มีใครดื่ม" : "ยืนยัน 🍻"}
      </Button>
    </div>
  );
}

function AmountStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="font-semibold">ดื่มคนละ</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="ลดจำนวนแก้ว"
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
          className="rounded-xl bg-panel p-2 disabled:opacity-30"
        >
          <Minus size={18} />
        </button>
        <span className="w-14 text-center text-2xl font-extrabold tabular-nums text-sun">{value}</span>
        <button
          type="button"
          aria-label="เพิ่มจำนวนแก้ว"
          disabled={value >= 20}
          onClick={() => onChange(Math.min(20, value + 1))}
          className="rounded-xl bg-panel p-2 disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
        <span className="font-semibold">แก้ว</span>
      </div>
    </div>
  );
}

// ---------- โดนดื่ม (เกิดได้ทุกเวลา: J, Q, นิ้วโผล่, กฎ 10, มินิเกม ฯลฯ) ----------
function DrinkModal({ open, state, onClose }: { open: boolean; state: OhanaState; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="🍺 โดนดื่ม">
      {open && <DrinkForm state={state} onClose={onClose} />}
    </Modal>
  );
}

function DrinkForm({ state, onClose }: { state: OhanaState; onClose: () => void }) {
  const room = useRoom();
  const [picked, setPicked] = useState<string[]>([]);
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState(DRINK_REASONS[0]);
  const [custom, setCustom] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [buddies, setBuddies] = useState(true);
  const [saving, setSaving] = useState(false);
  const finalReason = isCustom ? custom.trim() : reason;
  const hitsBuddy = picked.some((id) => state.buddies.includes(id));
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!picked.length || !finalReason) return;
        setSaving(true);
        const ok = await room.dispatch("ohana.addDrinks", { targets: picked, amount, reason: finalReason, buddies });
        setSaving(false);
        if (ok) onClose();
      }}
    >
      <p className="mb-2 font-bold">ใครต้องดื่ม?</p>
      <div className="grid grid-cols-2 gap-2">
        {room.players
          .filter((p) => state.order.includes(p.id))
          .map((p) => {
            const on = picked.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-2 rounded-2xl border-2 px-2 py-2 text-left font-semibold transition ${
                  on ? "border-sun bg-sun text-ink" : "border-line bg-panel2"
                }`}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="truncate">{p.nickname}</span>
                {state.buddies.includes(p.id) && <span className="ml-auto text-sm">👯</span>}
              </button>
            );
          })}
      </div>

      <AmountStepper value={amount} onChange={setAmount} />

      <p className="mb-2 mt-4 font-bold">สาเหตุ</p>
      <div className="flex flex-wrap gap-1.5">
        {DRINK_REASONS.map((r) => {
          const on = !isCustom && reason === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setReason(r);
                setIsCustom(false);
              }}
              className={`rounded-xl border-2 px-2 py-1 text-sm font-semibold ${on ? "border-sky/60 bg-sky/20 text-sky-100" : "border-white/10 bg-white/5"}`}
            >
              {r}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={isCustom}
          onClick={() => setIsCustom(true)}
          className={`rounded-xl border-2 px-2 py-1 text-sm font-semibold ${isCustom ? "border-sky/60 bg-sky/20 text-sky-100" : "border-white/10 bg-white/5"}`}
        >
          ✏️ อื่น ๆ
        </button>
      </div>
      {isCustom && (
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={60}
          autoFocus
          placeholder="เช่น ทำแก้วหก, มาสาย"
          className="mt-2 w-full rounded-2xl p-2.5 text-lg font-semibold border border-white/15 bg-black/30 text-white placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
        />
      )}

      {hitsBuddy && (
        <label className="mt-3 flex items-center gap-2 rounded-2xl bg-pink/20 p-2 text-sm">
          <input type="checkbox" checked={buddies} onChange={(e) => setBuddies(e.target.checked)} className="size-5" />
          👯 วงบัดดี้ดื่มตามด้วย ({state.buddies.length} คน)
        </label>
      )}

      <Button type="submit" tone="sun" size="lg" className="mt-4 w-full" disabled={!picked.length || !finalReason || saving}>
        บันทึก 🍻
      </Button>
    </form>
  );
}

// ---------- สถิติดื่มทั้งเกม ----------
function DrinkBoard({ state }: { state: OhanaState }) {
  const room = useRoom();
  const [giving, setGiving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const drinks = state.drinks ?? {};
  const rows = state.order
    .map((id) => ({ id, p: room.player(id), n: drinks[id] ?? 0 }))
    .filter((r) => r.p)
    .sort((a, b) => b.n - a.n);
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  const top = rows[0]?.n ?? 0;

  return (
    <div className="card-3d mt-5 rounded-3xl bg-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-bold">🍺 สถิติดื่มทั้งเกม</p>
        <span className="text-sm text-muted">รวม {total} แก้ว</span>
      </div>
      <Button tone="sun" className="mb-2 w-full" onClick={() => setGiving(true)}>
        🍺 โดนดื่ม (J, Q, นิ้วโผล่, กฎ, มินิเกม…)
      </Button>
      <p className="mb-2 text-xs text-muted">ไพ่ที่จั่วได้นับให้อัตโนมัติ · แตะชื่อเพื่อดูว่าดื่มเพราะอะไร</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ id, p, n }) => {
          const open = expanded === id;
          const by = Object.entries(state.drinkBy?.[id] ?? {}).sort((a, b) => b[1] - a[1]);
          return (
            <li key={id} className="rounded-2xl bg-panel2">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-xl">{p!.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {p!.nickname}
                    {n > 0 && n === top && <span className="ml-1">👑</span>}
                    {state.buddies.includes(id) && <span className="ml-1 text-sm">👯</span>}
                  </span>
                  <span className="w-10 text-right text-xl font-extrabold tabular-nums text-sun">{n}</span>
                  <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
                </button>
              </div>
              {open && (
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {by.length ? (
                    by.map(([reason, count]) => (
                      <span key={reason} className="rounded-lg bg-panel px-1.5 py-0.5 text-sm">
                        {reason} <b className="text-sun">×{count}</b>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted">{n > 0 ? "ไม่มีรายละเอียด (บันทึกก่อนอัปเดต)" : "ยังไม่ได้ดื่ม"}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <DrinkLog log={state.drinkLog ?? []} />

      <DrinkModal open={giving} state={state} onClose={() => setGiving(false)} />
    </div>
  );
}

function DrinkLog({ log }: { log: DrinkEvent[] }) {
  const room = useRoom();
  const [all, setAll] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  if (!log.length) return null;
  const shown = all ? log : log.slice(0, 5);
  return (
    <div className="mt-3">
      <p className="mb-1 text-sm font-semibold text-muted">ล่าสุด</p>
      <ul className="flex flex-col gap-1 text-sm">
        {shown.map((ev) => (
          <li key={ev.id} className="flex items-center gap-2 rounded-xl bg-panel2/60 px-2 py-1">
            <span className="min-w-0 flex-1">
              <span className="font-semibold">
                {ev.targets.map((id) => `${room.player(id)?.emoji ?? ""}${room.player(id)?.nickname ?? "?"}`).join(", ")}
              </span>{" "}
              <span className="text-sun">+{ev.amount}</span> <span className="text-muted">· {ev.reason}</span>
            </span>
            {room.isHost &&
              (confirmId === ev.id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-1.5 py-0.5 text-muted">
                    ไม่
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await room.dispatch("ohana.undoDrink", { logId: ev.id });
                      setConfirmId(null);
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/20 px-1.5 py-0.5 font-semibold text-rose-300"
                  >
                    ลบรายการ
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  aria-label="ลบรายการนี้"
                  onClick={() => setConfirmId(ev.id)}
                  className="shrink-0 rounded-lg p-1 text-muted/60 hover:text-white"
                >
                  <Undo2 size={14} />
                </button>
              ))}
          </li>
        ))}
      </ul>
      {log.length > 5 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 text-sm text-muted underline">
          {all ? "ย่อ" : `ดูทั้งหมด (${log.length})`}
        </button>
      )}
    </div>
  );
}

// ---------- จับเวลาพัก (ไพ่ 8) ----------
function RestControl({ state }: { state: OhanaState }) {
  const room = useRoom();
  const ms = useRemaining(state.restTimer?.endsAt);
  const running = !!state.restTimer && ms > 0;
  return (
    <div className="mt-4 rounded-2xl bg-panel2 p-3">
      {running ? (
        <>
          <div className="text-6xl font-extrabold tabular-nums text-mint">{formatTime(ms)}</div>
          <Button tone="ghost" size="sm" className="mt-2" onClick={() => room.dispatch("ohana.stopRest")}>
            หยุดจับเวลา
          </Button>
        </>
      ) : (
        <Button tone="mint" size="lg" className="w-full" onClick={() => room.dispatch("ohana.startRest")}>
          <Timer size={22} /> เริ่มจับเวลาพัก 2 นาที
        </Button>
      )}
    </div>
  );
}

function RestBanner({ state }: { state: OhanaState }) {
  const room = useRoom();
  const ms = useRemaining(state.restTimer?.endsAt);
  const doneShown = useRestDone(state.restTimer?.endsAt ?? null, ms);
  if (!state.restTimer || (ms <= 0 && !doneShown)) return null;
  const by = room.player(state.restTimer.by);
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`card-3d mb-3 flex items-center justify-between rounded-3xl p-3 ${ms > 0 ? "tint-mint" : "tint-rose"}`}
    >
      <div>
        <div className="text-sm font-semibold">⏱️ เวลาพักของ {by?.emoji} {by?.nickname}</div>
        <div className="text-3xl font-extrabold tabular-nums">{ms > 0 ? formatTime(ms) : "หมดเวลาพัก!"}</div>
      </div>
      <Button tone="white" size="sm" onClick={() => room.dispatch("ohana.stopRest")}>
        ปิด
      </Button>
    </motion.div>
  );
}

function useRestDone(endsAt: number | null, ms: number) {
  const [doneAt, setDoneAt] = useState<number | null>(null);
  useEffect(() => {
    if (endsAt && ms <= 0 && doneAt !== endsAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- แจ้งเตือนครั้งเดียวเมื่อหมดเวลา
      setDoneAt(endsAt);
      navigator.vibrate?.([300, 100, 300]);
    }
  }, [endsAt, ms, doneAt]);
  return doneAt === endsAt;
}

// ---------- แถบสถานะด้านล่าง ----------
function StatusBar({ state, onEditRule }: { state: OhanaState; onEditRule: () => void }) {
  const room = useRoom();
  const queen = room.player(state.queen);
  const jack = room.player(state.jack);
  const canEditRule = !!state.rule && (state.rule.by === room.me || room.isHost);
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-white/10 bg-panel/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-md flex-col gap-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="w-20 shrink-0 font-bold text-pink">👯 บัดดี้</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {state.buddies.length ? (
              state.buddies.map((id) => (
                <span key={id} className="rounded-lg bg-pink/25 px-1.5 py-0.5 font-semibold">
                  {room.player(id)?.emoji} {room.player(id)?.nickname}
                </span>
              ))
            ) : (
              <span className="text-muted">ยังไม่มี</span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-20 shrink-0 font-bold text-sun">📜 กฎ</span>
          <span className="min-w-0 flex-1 font-semibold">
            {state.rule ? (
              state.rule.text || (
                <span className="text-muted">รอ {room.player(state.rule.by)?.nickname} ตั้งกฎ...</span>
              )
            ) : (
              <span className="text-muted">ยังไม่มี</span>
            )}
          </span>
          {canEditRule && (
            <button type="button" onClick={onEditRule} aria-label="แก้ไขกฎ" className="rounded-lg bg-sun p-1 text-ink">
              <Pencil size={14} />
            </button>
          )}
        </div>
        <div className="flex items-start gap-2">
          <span className="w-20 shrink-0 font-bold text-sky">😜 แจ็ค</span>
          <span className="min-w-0 flex-1 font-semibold">
            {jack ? `${jack.emoji} ${jack.nickname} — ทำท่าบนหน้าเมื่อไหร่ ทำตามให้ไว!` : <span className="text-muted">ยังไม่มี</span>}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-20 shrink-0 font-bold text-violet">🤐 แหม่ม</span>
          <span className="min-w-0 flex-1 font-semibold">
            {queen ? `${queen.emoji} ${queen.nickname} — ห้ามคุยด้วย!` : <span className="text-muted">ยังไม่มี</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- แก้ไขกฎ (ไพ่ 10) ----------
function RuleModal({ open, state, onClose }: { open: boolean; state: OhanaState; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="📜 ตั้งกฎในเกม">
      <AnimatePresence>{open && <RuleForm key={state.rule?.by} state={state} onClose={onClose} />}</AnimatePresence>
    </Modal>
  );
}

function RuleForm({ state, onClose }: { state: OhanaState; onClose: () => void }) {
  const room = useRoom();
  const [text, setText] = useState(state.rule?.text ?? "");
  const ideas = ["ห้ามพูดคำว่า 'ไม่'", "ห้ามชี้นิ้ว", "ต้องเรียกทุกคนว่า 'ท่าน'", "ห้ามใช้มือขวาจับแก้ว", "พูดจบประโยคต้องมี 'จ้า'"];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        if (await room.dispatch("ohana.setRule", { text })) onClose();
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={140}
        rows={3}
        autoFocus
        placeholder="เช่น ห้ามพูดคำว่า 'เหล้า' ใครพูดดื่ม!"
        className="w-full resize-none rounded-2xl p-3 text-lg font-semibold border border-white/15 bg-black/30 text-white placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ideas.map((i) => (
          <button key={i} type="button" onClick={() => setText(i)} className="rounded-xl bg-panel2 px-2 py-1 text-sm">
            {i}
          </button>
        ))}
      </div>
      <Button type="submit" tone="sun" size="lg" className="mt-4 w-full" disabled={!text.trim()}>
        บันทึกกฎ
      </Button>
    </form>
  );
}
