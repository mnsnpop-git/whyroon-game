"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { ROLE_INFO } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import type { NightStep, WWRole, WerewolfSecret, WerewolfState } from "@/lib/types";
import { Avatar, PlayerName } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { TimerPill, useDeadline } from "../../ui/Countdown";
import { Modal } from "../../ui/Modal";
import { HostMenu } from "../HostMenu";

const STEP_LABEL: Record<NightStep, string> = {
  werewolf: "🐺 มนุษย์หมาป่ากำลังตื่น...",
  seer: "🔮 ผู้หยั่งรู้กำลังตื่น...",
  doctor: "🩺 หมอกำลังตื่น...",
};

function useWW() {
  const room = useRoom();
  const s = room.snap.state as WerewolfState;
  const secret = room.snap.secret?.kind === "werewolf" ? (room.snap.secret as WerewolfSecret) : null;
  const alive = s.players.filter((id) => !s.dead.includes(id));
  const meAlive = alive.includes(room.me);
  const inGame = s.players.includes(room.me);
  return { room, s, secret, alive, meAlive, inGame };
}

export function WerewolfGame() {
  const { room, s, meAlive, inGame } = useWW();

  // ขยับเฟสอัตโนมัติเมื่อหมดเวลา (หัวหน้าห้องเร็วสุด เครื่องอื่นเป็นตัวสำรอง)
  const deadline = s.phase === "night" ? s.stepEndsAt : s.phase === "hunter" ? s.hunter?.endsAt : s.phaseEndsAt;
  const delay = room.isHost ? 200 : 2500;
  useDeadline(
    s.phase === "ended" ? null : deadline,
    `${s.phase}:${s.nightStep}:${s.day}`,
    () => room.dispatch("ww.tick", { phase: s.phase, step: s.nightStep ?? undefined }),
    delay,
  );

  const night = s.phase === "night";
  const bg = night ? "night-bg" : s.phase === "ended" ? "party-bg" : "day-bg";

  return (
    <div className={`${bg} min-h-[calc(100dvh-60px)] transition-colors duration-700`}>
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white/70">
            🐺 Werewolf · {night ? `คืนที่ ${s.day}` : s.phase === "ended" ? "จบเกม" : `วันที่ ${s.day}`}
          </span>
          <HostMenu
            actions={
              s.phase !== "ended"
                ? [{ label: "⏩ ข้ามไปช่วงถัดไปทันที", tone: "sun", onClick: () => room.dispatch("ww.advance", {}) }]
                : []
            }
          />
        </div>

        {inGame && s.phase !== "ended" && <MyRole />}
        {inGame && !meAlive && s.phase !== "ended" && (
          <div className="rounded-2xl border-2 border-dashed border-white/30 bg-white/5 p-3 text-center font-semibold">
            👻 คุณเป็นวิญญาณ (ผู้ชม) — ดูเกมได้แต่โหวตหรือใช้สกิลไม่ได้
          </div>
        )}
        {!inGame && (
          <div className="rounded-2xl bg-white/5 p-3 text-center text-muted">👀 คุณเข้าห้องมาระหว่างเกม — ดูอย่างเดียวนะ</div>
        )}

        {s.phase === "night" && <NightPanel />}
        {s.phase === "day" && <DayPanel />}
        {s.phase === "vote" && <VotePanel />}
        {s.phase === "voteResult" && <VoteResultPanel />}
        {s.phase === "hunter" && <HunterPanel />}
        {s.phase === "ended" && <EndPanel />}

        {s.phase !== "ended" && <Village />}
        <GameLog />
      </main>
      <SeerReveal />
    </div>
  );
}

// ---------- การ์ดบทบาท (แตะเพื่อดู/ซ่อน) ----------
function MyRole() {
  const { secret } = useWW();
  const [show, setShow] = useState(false);
  if (!secret) return null;
  const info = ROLE_INFO[secret.role];
  return (
    <button
      type="button"
      onClick={() => setShow((v) => !v)}
      className="relative h-36 w-full [perspective:1000px]"
      aria-label={show ? "แตะเพื่อซ่อนบทบาท" : "แตะเพื่อดูบทบาท"}
    >
      <motion.div
        className="preserve-3d relative h-full w-full"
        animate={{ rotateY: show ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
      >
        <div className="backface-hidden card-3d absolute inset-0 flex items-center justify-center gap-3 rounded-3xl border-gold/50 bg-gradient-to-br from-[#13224a] via-[#0a1430] to-night shadow-[0_0_30px_-10px_rgba(217,185,121,0.4)]">
          <Eye size={30} />
          <div className="text-left">
            <div className="text-2xl font-extrabold">แตะเพื่อดูบทบาท</div>
            <div className="text-sm text-white/70">อย่าให้เพื่อนข้างๆ แอบดูนะ 🤫</div>
          </div>
        </div>
        <div
          className="backface-hidden card-3d absolute inset-0 flex items-center gap-3 rounded-3xl px-4 text-left [transform:rotateY(180deg)]"
          style={{ backgroundColor: info.color, color: secret.role === "hunter" ? "#13111C" : "#fff" }}
        >
          <span className="text-6xl">{info.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold opacity-80">คุณคือ</div>
            <div className="text-3xl font-extrabold leading-tight">{info.name}</div>
            <div className="text-sm leading-snug opacity-90">{info.desc}</div>
          </div>
          <EyeOff size={20} className="absolute right-3 top-3 opacity-60" />
        </div>
      </motion.div>
    </button>
  );
}

// ---------- กลางคืน ----------
function NightPanel() {
  const { room, s, secret, alive, meAlive } = useWW();
  const step = s.nightStep;
  const myTurn = !!step && meAlive && secret?.role === step;
  const acted = secret?.myAction && secret.myAction.night === s.day && secret.myAction.step === step;

  let content: React.ReactNode;
  if (!myTurn) {
    content = (
      <div className="py-6 text-center">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="text-7xl"
        >
          😴
        </motion.div>
        <p className="mt-3 text-2xl font-bold">หลับตาไว้... อย่าแอบดู!</p>
        <p className="mt-1 text-white/60">รอบทบาทอื่นทำหน้าที่</p>
      </div>
    );
  } else if (step === "werewolf") {
    const partners = (secret?.wolves ?? []).filter((id) => id !== room.me);
    const picks = secret?.wolfPicks ?? {};
    content = (
      <>
        <p className="mb-2 text-center text-xl font-bold text-coral">🐺 เลือกเหยื่อคืนนี้ 1 คน</p>
        {partners.length > 0 && (
          <p className="mb-3 text-center text-sm">
            หมาป่าด้วยกัน:{" "}
            {partners.map((id) => (
              <PlayerName key={id} player={room.player(id)} className="mx-1 font-bold text-coral" />
            ))}
          </p>
        )}
        <TargetGrid
          ids={alive.filter((id) => !(secret?.wolves ?? []).includes(id))}
          selected={picks[room.me]}
          tone="coral"
          badges={(id) =>
            Object.entries(picks)
              .filter(([, t]) => t === id)
              .map(([w]) => room.player(w)?.emoji ?? "🐺")
              .join("")
          }
          onPick={(id) => room.dispatch("ww.night", { target: id })}
        />
        <p className="mt-2 text-center text-xs text-white/60">เปลี่ยนใจได้จนกว่าหมาป่าทุกตัวจะเลือกครบ</p>
      </>
    );
  } else if (step === "seer") {
    content = acted ? (
      <p className="py-4 text-center text-lg">🔮 คืนนี้คุณส่องไปแล้ว รอเช้า...</p>
    ) : (
      <>
        <p className="mb-3 text-center text-xl font-bold text-sky">🔮 เลือกคนที่จะส่องดู 1 คน</p>
        <TargetGrid
          ids={alive.filter((id) => id !== room.me)}
          tone="violet"
          onPick={(id) => room.dispatch("ww.night", { target: id })}
        />
      </>
    );
  } else {
    content = acted ? (
      <p className="py-4 text-center text-lg">
        🩺 คืนนี้คุณปกป้อง <PlayerName player={room.player(secret?.myAction?.target)} className="font-bold" />
      </p>
    ) : (
      <>
        <p className="mb-3 text-center text-xl font-bold text-mint">🩺 เลือกคนที่จะปกป้องคืนนี้</p>
        <TargetGrid ids={alive} tone="mint" onPick={(id) => room.dispatch("ww.night", { target: id })} />
      </>
    );
  }

  return (
    <section className="card-3d rounded-3xl border-white/10 bg-night/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-lg font-bold">{step ? STEP_LABEL[step] : "🌙 กลางคืน"}</span>
        <TimerPill deadline={s.stepEndsAt} />
      </div>
      {content}
    </section>
  );
}

// ---------- ผู้หยั่งรู้: ป๊อปอัปเฉลย ----------
function SeerReveal() {
  const { room, secret } = useWW();
  const results = secret?.seerResults ?? [];
  const [seen, setSeen] = useState(results.length);
  const [open, setOpen] = useState<number | null>(null);
  if (results.length > seen) {
    setSeen(results.length);
    setOpen(results.length - 1);
  }
  const r = open !== null ? results[open] : null;
  return (
    <Modal open={!!r} onClose={() => setOpen(null)} className="text-center">
      {r && (
        <>
          <Avatar player={room.player(r.target)} size="xl" className="mx-auto" />
          <p className="mt-3 text-xl">
            <PlayerName player={room.player(r.target)} className="font-bold" />
          </p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className={`mt-3 text-3xl font-extrabold ${r.isWolf ? "text-coral" : "text-mint"}`}
          >
            {r.isWolf ? "คนนี้คือ 🐺 มนุษย์หมาป่า!" : "คนนี้คือ 🧑 ชาวบ้านบริสุทธิ์"}
          </motion.p>
          <Button tone="violet" size="lg" className="mt-5 w-full" onClick={() => setOpen(null)}>
            จำไว้แล้ว 🤫
          </Button>
        </>
      )}
    </Modal>
  );
}

// ---------- กลางวัน ----------
function NightNews() {
  const { room, s } = useWW();
  const r = s.nightResult;
  if (!r) return null;
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`card-3d rounded-3xl p-4 text-center ${r.killed ? "tint-rose" : "tint-mint"}`}
    >
      <div className="text-sm font-semibold opacity-80">☀️ ประกาศผลเมื่อคืน</div>
      {r.killed ? (
        <>
          <div className="my-1 text-5xl">💀</div>
          <div className="text-2xl font-extrabold">
            <PlayerName player={room.player(r.killed)} /> ถูกหมาป่าสังหาร!
          </div>
        </>
      ) : (
        <>
          <div className="my-1 text-5xl">🛡️</div>
          <div className="text-2xl font-extrabold">เมื่อคืนปลอดภัย ไม่มีใครเสียชีวิต!</div>
        </>
      )}
    </motion.div>
  );
}

function HunterNews() {
  const { room, s } = useWW();
  const h = s.hunterShot;
  if (!h) return null;
  return (
    <div className="card-3d rounded-3xl bg-sun p-3 text-center font-bold text-ink">
      🏹 พรานป่า <PlayerName player={room.player(h.by)} />{" "}
      {h.target ? (
        <>
          ยิง <PlayerName player={room.player(h.target)} /> ตายตามไปด้วย!
        </>
      ) : (
        "ไม่ได้ยิงใคร"
      )}
    </div>
  );
}

function DayPanel() {
  const { room, s } = useWW();
  return (
    <>
      <NightNews />
      <HunterNews />
      <section className="card-3d rounded-3xl bg-panel/90 p-4 text-center">
        <div className="text-lg font-bold">🗣️ ช่วงถกเถียง</div>
        <p className="text-white/70">คุยกัน จับผิดกัน ใครน่าสงสัยที่สุด?</p>
        <div className="my-3">
          <TimerPill deadline={s.phaseEndsAt} warnAt={15_000} className="!text-4xl" />
        </div>
        {room.isHost && (
          <Button tone="sun" size="lg" className="w-full" onClick={() => room.dispatch("ww.startVote")}>
            ⚖️ เริ่มโหวตเลย
          </Button>
        )}
      </section>
    </>
  );
}

function VotePanel() {
  const { room, s, secret, alive, meAlive } = useWW();
  const myVote = secret?.myVote?.day === s.day ? secret.myVote.target : null;
  return (
    <section className="card-3d rounded-3xl bg-panel/90 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-bold">⚖️ โหวตประหาร</span>
        <TimerPill deadline={s.phaseEndsAt} />
      </div>
      <p className="mb-3 text-sm text-white/70">
        โหวตแล้ว {s.voted.length}/{alive.length} คน — คะแนนเท่ากันหรือ &quot;ไม่โหวต&quot; ชนะ = ไม่มีใครออก
      </p>
      {meAlive ? (
        <>
          <TargetGrid
            ids={alive.filter((id) => id !== room.me)}
            selected={myVote ?? undefined}
            tone="coral"
            onPick={(id) => room.dispatch("ww.vote", { target: id })}
          />
          <Button
            tone={myVote === "skip" ? "sun" : "ghost"}
            size="lg"
            className="mt-3 w-full"
            onClick={() => room.dispatch("ww.vote", { target: "skip" })}
          >
            🙅 ไม่โหวต (ข้าม)
          </Button>
          {myVote && <p className="mt-2 text-center text-sm text-white/70">เปลี่ยนใจได้จนกว่าทุกคนจะโหวตครบ</p>}
        </>
      ) : (
        <p className="text-center text-white/70">👻 วิญญาณโหวตไม่ได้ รอดูผล...</p>
      )}
    </section>
  );
}

function VoteSummary() {
  const { room, s } = useWW();
  const v = s.voteResult;
  if (!v) return null;
  const role = v.eliminated ? s.revealed[v.eliminated] : null;
  return (
    <section className="card-3d rounded-3xl bg-panel/90 p-4 text-center">
      <div className="text-sm font-semibold text-white/70">⚖️ ผลโหวต</div>
      {v.eliminated && role ? (
        <>
          <Avatar player={room.player(v.eliminated)} size="lg" className="mx-auto mt-2" />
          <div className="mt-2 text-2xl font-extrabold">
            {room.player(v.eliminated)?.nickname} ถูกโหวตออก!
          </div>
          <motion.div
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mx-auto mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-2xl font-extrabold"
            style={{ backgroundColor: ROLE_INFO[role].color, color: role === "hunter" ? "#13111C" : "#fff" }}
          >
            {ROLE_INFO[role].emoji} {ROLE_INFO[role].name}
          </motion.div>
        </>
      ) : (
        <div className="mt-2 text-2xl font-extrabold">🤷 ไม่มีใครถูกโหวตออก</div>
      )}
      <ul className="mt-4 flex flex-col gap-1 text-left text-sm">
        {Object.entries(v.votes).map(([voter, target]) => (
          <li key={voter} className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2 py-1">
            <PlayerName player={room.player(voter)} className="font-semibold" />
            <span className="text-white/50">→</span>
            {target === "skip" ? <span className="text-white/60">ไม่โหวต</span> : <PlayerName player={room.player(target)} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function VoteResultPanel() {
  const { s } = useWW();
  return (
    <>
      <VoteSummary />
      <p className="flex items-center justify-center gap-2 text-center text-white/70">
        🌙 ค่ำคืนกำลังมาเยือนใน <TimerPill deadline={s.phaseEndsAt} />
      </p>
    </>
  );
}

function HunterPanel() {
  const { room, s, alive } = useWW();
  const hunterId = s.hunter?.id;
  const me = hunterId === room.me;
  return (
    <>
      {s.hunter?.then === "day" ? <NightNews /> : <VoteSummary />}
      <section className="card-3d rounded-3xl bg-sun p-4 text-ink">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xl font-extrabold">🏹 พรานป่าล้มลง!</span>
          <TimerPill deadline={s.hunter?.endsAt} />
        </div>
        {me ? (
          <>
            <p className="mb-3 font-semibold">เลือกยิงผู้เล่น 1 คนให้ตายตามไปด้วย!</p>
            <TargetGrid
              ids={alive.filter((id) => id !== room.me)}
              tone="coral"
              onPick={(id) => room.dispatch("ww.hunterShoot", { target: id })}
            />
            <Button tone="ghost" className="mt-3 w-full" onClick={() => room.dispatch("ww.hunterShoot", { target: "none" })}>
              ไม่ยิงใคร
            </Button>
          </>
        ) : (
          <p className="text-lg font-semibold">
            <PlayerName player={room.player(hunterId)} /> คือพรานป่า กำลังเล็งปืน... 🎯
          </p>
        )}
      </section>
    </>
  );
}

// ---------- จบเกม ----------
function EndPanel() {
  const { room, s } = useWW();
  const wolvesWin = s.winner === "wolves";
  const myRole = s.allRoles?.[room.me];
  const iWon = myRole ? (ROLE_INFO[myRole].team === "wolves") === wolvesWin : false;

  useEffect(() => {
    const colors = wolvesWin ? ["#EF4444", "#8B5CF6"] : ["#10B981", "#FACC15", "#38BDF8"];
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0 }, colors }), 400);
    const t2 = setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1 }, colors }), 700);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [wolvesWin]);

  const roles = s.allRoles ?? {};
  const order: WWRole[] = ["werewolf", "seer", "doctor", "hunter", "villager"];
  const sorted = [...s.players].sort((a, b) => order.indexOf(roles[a]) - order.indexOf(roles[b]));

  return (
    <>
      <motion.section
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className={`card-3d rounded-3xl p-6 text-center ${wolvesWin ? "tint-rose" : "tint-mint"}`}
      >
        <div className="text-7xl">{wolvesWin ? "🐺" : "🧑‍🌾"}</div>
        <div className="mt-2 text-4xl font-extrabold">{wolvesWin ? "ฝ่ายหมาป่าชนะ!" : "ฝ่ายชาวบ้านชนะ!"}</div>
        {myRole && <div className="mt-1 text-lg font-semibold">{iWon ? "🎉 คุณชนะ!" : "😭 คุณแพ้..."}</div>}
      </motion.section>

      <section className="card-3d rounded-3xl bg-panel p-4">
        <h2 className="mb-3 text-lg font-bold">🃏 เฉลยบทบาททุกคน</h2>
        <ul className="flex flex-col gap-2">
          {sorted.map((id) => {
            const role = roles[id];
            const info = role ? ROLE_INFO[role] : null;
            const dead = s.dead.includes(id);
            return (
              <li key={id} className="flex items-center gap-3 rounded-2xl bg-panel2 p-2">
                <Avatar player={room.player(id)} size="sm" dim={dead} />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {room.player(id)?.nickname ?? "ผู้เล่นที่ออกไปแล้ว"} {dead && "👻"}
                </span>
                {info && (
                  <span
                    className="rounded-xl px-2 py-0.5 text-sm font-bold"
                    style={{ backgroundColor: info.color, color: role === "hunter" ? "#13111C" : "#fff" }}
                  >
                    {info.emoji} {info.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {room.isHost ? (
        <div className="flex flex-col gap-3">
          <Button tone="pink" size="xl" onClick={() => room.dispatch("ww.restart")}>
            🔄 เล่นใหม่อีกรอบ
          </Button>
          <Button tone="ghost" size="lg" onClick={() => room.dispatch("game.end")}>
            ⚙️ กลับไปตั้งค่าบทบาท
          </Button>
        </div>
      ) : (
        <p className="text-center text-muted">⏳ รอหัวหน้าห้องเริ่มรอบใหม่...</p>
      )}
    </>
  );
}

// ---------- รายชื่อชาวบ้าน ----------
function Village() {
  const { room, s, secret } = useWW();
  const wolves = secret?.role === "werewolf" ? secret.wolves ?? [] : [];
  return (
    <section className="card-3d rounded-3xl bg-panel/80 p-4">
      <h2 className="mb-3 text-lg font-bold">
        🏘️ หมู่บ้าน ({s.players.length - s.dead.length}/{s.players.length} คนรอด)
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {s.players.map((id) => {
          const dead = s.dead.includes(id);
          const revealed = s.revealed[id];
          const isWolfMate = wolves.includes(id) && id !== room.me;
          return (
            <div
              key={id}
              className={`relative flex flex-col items-center rounded-2xl p-2 text-center ${dead ? "bg-white/5" : "bg-panel2"}`}
            >
              <div className={`text-3xl ${dead ? "opacity-40 grayscale" : ""}`}>{room.player(id)?.emoji ?? "❔"}</div>
              {dead && <span className="absolute right-1 top-1 text-lg">👻</span>}
              <div className={`w-full truncate text-xs font-semibold ${dead ? "text-white/40 line-through" : ""}`}>
                {room.player(id)?.nickname ?? "ออกไปแล้ว"}
              </div>
              {revealed && (
                <div className="text-[10px] font-bold" style={{ color: ROLE_INFO[revealed].color }}>
                  {ROLE_INFO[revealed].emoji} {ROLE_INFO[revealed].name}
                </div>
              )}
              {!revealed && isWolfMate && <div className="text-[10px] font-bold text-coral">🐺 พวกเดียวกัน</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GameLog() {
  const { s } = useWW();
  if (!s.log.length) return null;
  return (
    <details className="rounded-2xl bg-black/20 p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-white/70">📜 บันทึกเหตุการณ์</summary>
      <ul className="mt-2 flex flex-col gap-1">
        {[...s.log].reverse().map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </details>
  );
}

// ---------- ตารางเลือกเป้าหมาย ----------
function TargetGrid({
  ids,
  onPick,
  selected,
  tone,
  badges,
}: {
  ids: string[];
  onPick: (id: string) => void;
  selected?: string;
  tone: "coral" | "violet" | "mint";
  badges?: (id: string) => string;
}) {
  const room = useRoom();
  const ring = { coral: "ring-coral/70 bg-rose-500/20", violet: "ring-sky/70 bg-sky/20", mint: "ring-mint/70 bg-mint/20" }[tone];
  return (
    <div className="grid grid-cols-3 gap-2">
      {ids.map((id) => {
        const p = room.player(id);
        const active = selected === id;
        const b = badges?.(id);
        return (
          <motion.button
            key={id}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onPick(id)}
            className={`btn-3d relative flex flex-col items-center rounded-2xl p-2 ${active ? `ring-2 ${ring}` : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <span className="text-4xl">{p?.emoji ?? "❔"}</span>
            <span className="w-full truncate text-sm font-semibold">
              {p?.nickname}
              {id === room.me && " (คุณ)"}
            </span>
            {b && <span className="absolute -right-1 -top-2 rounded-full bg-ink px-1 text-sm">{b}</span>}
          </motion.button>
        );
      })}
      {ids.length === 0 && <p className="col-span-3 text-center text-white/60">ไม่มีเป้าหมายให้เลือก</p>}
    </div>
  );
}
