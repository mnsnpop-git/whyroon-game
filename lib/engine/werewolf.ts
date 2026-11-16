import type {
  NightStep,
  WWRole,
  WerewolfGameSecret,
  WerewolfSecret,
  WerewolfState,
} from "../types";
import {
  type Changes,
  type Ctx,
  GameError,
  type Payload,
  activePlayers,
  clone,
  nameOf,
  pick,
  randomBetween,
  requireHost,
  shuffle,
  str,
} from "./core";

const STEPS: NightStep[] = ["werewolf", "seer", "doctor"];
const HUNTER_MS = 30_000;
const VOTE_RESULT_MS = 8_000;

type Secrets = Record<string, WerewolfSecret>;

interface Work {
  ctx: Ctx;
  state: WerewolfState;
  secret: WerewolfGameSecret;
  secrets: Secrets;
  touched: Set<string>;
}

function getWork(ctx: Ctx): Work {
  if (ctx.state?.kind !== "werewolf") throw new GameError("ไม่ได้อยู่ในเกม Werewolf");
  const secret = ctx.gameSecret as unknown as WerewolfGameSecret | null;
  if (!secret?.roles) throw new GameError("ข้อมูลบทบาทผิดพลาด");
  return {
    ctx,
    state: clone(ctx.state),
    secret: clone(secret),
    secrets: clone(ctx.playerSecrets) as unknown as Secrets,
    touched: new Set(),
  };
}

function finish(w: Work): Changes {
  const playerSecrets: Record<string, unknown> = {};
  for (const id of w.touched) playerSecrets[id] = w.secrets[id];
  return {
    state: w.state,
    gameSecret: w.secret,
    ...(w.touched.size ? { playerSecrets } : {}),
  };
}

function alive(w: Work) {
  return w.state.players.filter((id) => !w.state.dead.includes(id));
}

function isAlive(w: Work, id: string) {
  return w.state.players.includes(id) && !w.state.dead.includes(id);
}

function holders(w: Work, role: WWRole, onlyAlive = true) {
  return w.state.players.filter(
    (id) => w.secret.roles[id] === role && (!onlyAlive || isAlive(w, id)),
  );
}

function patchSecret(w: Work, id: string, patch: Partial<WerewolfSecret>) {
  w.secrets[id] = { ...w.secrets[id], ...patch };
  w.touched.add(id);
}

function log(w: Work, text: string) {
  w.state.log = [...w.state.log, text].slice(-40);
}

// ---------- start ----------
export function startWerewolf(ctx: Ctx): Changes {
  const s = ctx.setup.werewolf;
  const players = activePlayers(ctx).map((p) => p.id);
  const n = players.length;
  const wolves = Math.max(0, Math.floor(s.roles.werewolf));
  const seer = Math.min(1, Math.max(0, Math.floor(s.roles.seer)));
  const doctor = Math.min(1, Math.max(0, Math.floor(s.roles.doctor)));
  const hunter = Math.min(1, Math.max(0, Math.floor(s.roles.hunter)));
  if (n < 4) throw new GameError("Werewolf ต้องมีผู้เล่นอย่างน้อย 4 คน");
  if (wolves < 1) throw new GameError("ต้องมีมนุษย์หมาป่าอย่างน้อย 1 ตัว");
  if (wolves * 2 >= n) throw new GameError("หมาป่าเยอะเกินไป! ต้องน้อยกว่าครึ่งหนึ่งของผู้เล่น");
  const specials = wolves + seer + doctor + hunter;
  if (specials > n) throw new GameError("จำนวนบทบาทพิเศษมากกว่าจำนวนผู้เล่น");

  const pool: WWRole[] = [
    ...Array<WWRole>(wolves).fill("werewolf"),
    ...Array<WWRole>(seer).fill("seer"),
    ...Array<WWRole>(doctor).fill("doctor"),
    ...Array<WWRole>(hunter).fill("hunter"),
    ...Array<WWRole>(n - specials).fill("villager"),
  ];
  const dealt = shuffle(pool);
  const roles: Record<string, WWRole> = {};
  players.forEach((id, i) => (roles[id] = dealt[i]));
  const wolfIds = players.filter((id) => roles[id] === "werewolf");

  const playerSecrets: Record<string, WerewolfSecret> = {};
  for (const id of players) {
    playerSecrets[id] = {
      kind: "werewolf",
      role: roles[id],
      ...(roles[id] === "werewolf" ? { wolves: wolfIds, wolfPicks: {} } : {}),
      ...(roles[id] === "seer" ? { seerResults: [] } : {}),
      myAction: null,
      myVote: null,
    };
  }

  const state: WerewolfState = {
    kind: "werewolf",
    players,
    dead: [],
    phase: "night",
    day: 1,
    nightStep: null,
    stepEndsAt: null,
    phaseEndsAt: null,
    rolesInGame: { werewolf: wolves, seer, doctor, hunter, villager: n - specials },
    nightResult: null,
    voted: [],
    voteResult: null,
    hunter: null,
    hunterShot: null,
    revealed: {},
    winner: null,
    allRoles: null,
    log: [],
    settings: {
      nightSeconds: clampSec(s.nightSeconds, 15, 120, 30),
      discussSeconds: clampSec(s.discussSeconds, 30, 900, 180),
      voteSeconds: clampSec(s.voteSeconds, 15, 300, 60),
    },
  };
  const secret: WerewolfGameSecret = {
    roles,
    wolfPicks: {},
    seerTarget: null,
    doctorTarget: null,
    votes: {},
  };

  const w: Work = { ctx, state, secret, secrets: playerSecrets, touched: new Set() };
  log(w, "🌙 คืนที่ 1 เริ่มต้นขึ้น...");
  beginStep(w, 0);

  return {
    room: { stage: "playing", game: "werewolf" },
    state: w.state,
    gameSecret: w.secret,
    clearPlayerSecrets: true,
    playerSecrets,
  };
}

function clampSec(v: number, min: number, max: number, fallback: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

// ---------- night ----------
/** เริ่มขั้นตอนกลางคืนลำดับ idx (ข้ามบทบาทที่ไม่มีในเกม) */
function beginStep(w: Work, idx: number) {
  const now = w.ctx.now;
  for (let i = idx; i < STEPS.length; i++) {
    const step = STEPS[i];
    if (w.state.rolesInGame[step] <= 0) continue;
    w.state.phase = "night";
    w.state.nightStep = step;
    const anyAlive = holders(w, step).length > 0;
    // ถ้าคนถือบทบาทตายแล้ว ยังรอเวลาหลอกๆ เพื่อไม่ให้คนอื่นเดาได้
    w.state.stepEndsAt = anyAlive
      ? now + w.state.settings.nightSeconds * 1000
      : now + randomBetween(6, 10) * 1000;
    return;
  }
  resolveNight(w);
}

function stepIndex(step: NightStep | null) {
  return step ? STEPS.indexOf(step) : -1;
}

function advanceStep(w: Work) {
  beginStep(w, stepIndex(w.state.nightStep) + 1);
}

function wolfTarget(w: Work): string | null {
  const counts: Record<string, number> = {};
  for (const wolf of holders(w, "werewolf")) {
    const t = w.secret.wolfPicks[wolf];
    if (t && isAlive(w, t)) counts[t] = (counts[t] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  return pick(entries.filter(([, c]) => c === max).map(([id]) => id));
}

function resolveNight(w: Work) {
  const target = wolfTarget(w);
  const saved = !!target && target === w.secret.doctorTarget;
  const killed = target && !saved ? target : null;

  w.state.nightResult = { killed, savedSomeone: saved };
  w.state.nightStep = null;
  w.state.stepEndsAt = null;
  w.secret.lastDoctorTarget = w.secret.doctorTarget;
  w.secret.wolfPicks = {};
  w.secret.seerTarget = null;
  w.secret.doctorTarget = null;
  for (const wolf of holders(w, "werewolf", false)) patchSecret(w, wolf, { wolfPicks: {} });

  if (killed) {
    w.state.dead.push(killed);
    log(w, `☀️ เช้าวันที่ ${w.state.day}: ${nameOf(w.ctx, killed)} ถูกหมาป่าสังหาร`);
  } else {
    log(w, `☀️ เช้าวันที่ ${w.state.day}: เมื่อคืนปลอดภัย ไม่มีใครเสียชีวิต`);
  }

  if (killed && w.secret.roles[killed] === "hunter") {
    startHunter(w, killed, "day");
    return;
  }
  continueAfter(w, "day");
}

// ---------- day / vote ----------
function beginDay(w: Work) {
  w.state.phase = "day";
  w.state.phaseEndsAt = w.ctx.now + w.state.settings.discussSeconds * 1000;
  w.state.voteResult = null;
}

function beginVote(w: Work) {
  w.state.phase = "vote";
  w.state.phaseEndsAt = w.ctx.now + w.state.settings.voteSeconds * 1000;
  w.state.voted = [];
  w.secret.votes = {};
}

function tallyVotes(w: Work) {
  const tally: Record<string, number> = {};
  let skips = 0;
  const votes: Record<string, string> = {};
  for (const voter of alive(w)) {
    const t = w.secret.votes[voter];
    if (!t) continue;
    votes[voter] = t;
    if (t === "skip") skips += 1;
    else if (isAlive(w, t)) tally[t] = (tally[t] ?? 0) + 1;
  }
  const entries = Object.entries(tally);
  const max = entries.length ? Math.max(...entries.map(([, c]) => c)) : 0;
  const top = entries.filter(([, c]) => c === max);
  const eliminated = max > 0 && top.length === 1 && max > skips ? top[0][0] : null;

  w.state.voteResult = { eliminated, tally, skips, votes };
  w.state.voted = [];
  w.secret.votes = {};

  if (eliminated) {
    w.state.dead.push(eliminated);
    w.state.revealed[eliminated] = w.secret.roles[eliminated];
    log(w, `⚖️ วันที่ ${w.state.day}: ${nameOf(w.ctx, eliminated)} ถูกโหวตออก`);
    if (w.secret.roles[eliminated] === "hunter") {
      startHunter(w, eliminated, "night");
      return;
    }
  } else {
    log(w, `⚖️ วันที่ ${w.state.day}: ไม่มีใครถูกโหวตออก`);
  }

  const winner = checkWinner(w);
  if (winner) return endGame(w, winner);
  w.state.phase = "voteResult";
  w.state.phaseEndsAt = w.ctx.now + VOTE_RESULT_MS;
}

function beginNight(w: Work) {
  w.state.day += 1;
  w.state.nightResult = null;
  w.state.hunterShot = null;
  w.state.phaseEndsAt = null;
  log(w, `🌙 คืนที่ ${w.state.day} เริ่มต้นขึ้น...`);
  beginStep(w, 0);
}

// ---------- hunter ----------
function startHunter(w: Work, id: string, then: "day" | "night") {
  w.state.phase = "hunter";
  w.state.hunter = { id, endsAt: w.ctx.now + HUNTER_MS, then };
  w.state.hunterShot = null;
  w.state.revealed[id] = "hunter";
  w.state.phaseEndsAt = null;
}

function continueAfter(w: Work, then: "day" | "night") {
  w.state.hunter = null;
  const winner = checkWinner(w);
  if (winner) return endGame(w, winner);
  if (then === "day") beginDay(w);
  else beginNight(w);
}

// ---------- win ----------
function checkWinner(w: Work): "wolves" | "villagers" | null {
  const living = alive(w);
  const wolves = living.filter((id) => w.secret.roles[id] === "werewolf").length;
  const others = living.length - wolves;
  if (wolves === 0) return "villagers";
  if (wolves >= others) return "wolves";
  return null;
}

function endGame(w: Work, winner: "wolves" | "villagers") {
  w.state.phase = "ended";
  w.state.winner = winner;
  w.state.allRoles = { ...w.secret.roles };
  w.state.nightStep = null;
  w.state.stepEndsAt = null;
  w.state.phaseEndsAt = null;
  w.state.hunter = null;
  log(w, winner === "wolves" ? "🐺 ฝ่ายหมาป่าชนะ!" : "🧑‍🌾 ฝ่ายชาวบ้านชนะ!");
}

// ---------- actions ----------
export function werewolfAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  if (type === "ww.restart") {
    requireHost(ctx);
    return startWerewolf(ctx);
  }

  const w = getWork(ctx);
  const s = w.state;
  const me = ctx.actor;

  switch (type) {
    case "ww.night": {
      if (s.phase !== "night" || !s.nightStep) throw new GameError("ไม่ใช่ช่วงกลางคืน");
      if (!isAlive(w, me)) throw new GameError("วิญญาณใช้สกิลไม่ได้ 👻");
      const role = w.secret.roles[me];
      if (role !== s.nightStep) throw new GameError("ยังไม่ถึงตาของบทบาทคุณ");
      const target = str(p, "target", 64);
      if (!isAlive(w, target)) throw new GameError("เลือกเป้าหมายไม่ถูกต้อง");

      if (role === "werewolf") {
        if (w.secret.roles[target] === "werewolf") throw new GameError("ห้ามเลือกหมาป่าด้วยกัน");
        w.secret.wolfPicks[me] = target;
        for (const wolf of holders(w, "werewolf", false)) {
          patchSecret(w, wolf, { wolfPicks: { ...w.secret.wolfPicks } });
        }
        patchSecret(w, me, { myAction: { night: s.day, step: "werewolf", target } });
        const all = holders(w, "werewolf").every((id) => w.secret.wolfPicks[id]);
        if (all) advanceStep(w);
      } else if (role === "seer") {
        if (target === me) throw new GameError("ส่องตัวเองไม่ได้");
        if (w.secret.seerTarget) throw new GameError("คืนนี้คุณส่องไปแล้ว");
        w.secret.seerTarget = target;
        const isWolf = w.secret.roles[target] === "werewolf";
        const prev = w.secrets[me]?.seerResults ?? [];
        patchSecret(w, me, {
          seerResults: [...prev, { night: s.day, target, isWolf }],
          myAction: { night: s.day, step: "seer", target },
        });
        advanceStep(w);
      } else if (role === "doctor") {
        if (w.secret.doctorTarget) throw new GameError("คืนนี้คุณเลือกไปแล้ว");
        w.secret.doctorTarget = target;
        patchSecret(w, me, { myAction: { night: s.day, step: "doctor", target } });
        advanceStep(w);
      }
      return finish(w);
    }

    case "ww.vote": {
      if (s.phase !== "vote") throw new GameError("ยังไม่ถึงช่วงโหวต");
      if (!isAlive(w, me)) throw new GameError("วิญญาณโหวตไม่ได้ 👻");
      const target = str(p, "target", 64);
      if (target !== "skip") {
        if (!isAlive(w, target)) throw new GameError("เลือกคนที่ยังมีชีวิตอยู่");
        if (target === me) throw new GameError("โหวตตัวเองไม่ได้");
      }
      w.secret.votes[me] = target;
      if (!s.voted.includes(me)) s.voted.push(me);
      patchSecret(w, me, { myVote: { day: s.day, target } });
      if (alive(w).every((id) => w.secret.votes[id])) tallyVotes(w);
      return finish(w);
    }

    case "ww.hunterShoot": {
      if (s.phase !== "hunter" || !s.hunter) throw new GameError("ไม่ใช่ช่วงพรานป่า");
      if (s.hunter.id !== me) throw new GameError("เฉพาะพรานป่าเท่านั้น");
      const raw = str(p, "target", 64);
      const target = raw === "none" ? null : raw;
      if (target && (!isAlive(w, target) || target === me)) {
        throw new GameError("เลือกเป้าหมายไม่ถูกต้อง");
      }
      if (target) {
        s.dead.push(target);
        log(w, `🏹 พรานป่า ${nameOf(ctx, me)} ยิง ${nameOf(ctx, target)}`);
      } else {
        log(w, `🏹 พรานป่า ${nameOf(ctx, me)} ไม่ยิงใคร`);
      }
      s.hunterShot = { by: me, target };
      continueAfter(w, s.hunter.then);
      return finish(w);
    }

    case "ww.startVote": {
      requireHost(ctx);
      if (s.phase !== "day") return null;
      beginVote(w);
      return finish(w);
    }

    case "ww.tick":
    case "ww.advance": {
      const force = type === "ww.advance";
      if (force) requireHost(ctx);
      const now = ctx.now;
      const due = (t: number | null) => force || (t !== null && now >= t - 300);
      if (typeof p.phase === "string" && p.phase !== s.phase) return null;
      if (typeof p.step === "string" && p.step !== s.nightStep) return null;

      switch (s.phase) {
        case "night":
          if (!due(s.stepEndsAt)) return null;
          advanceStep(w);
          break;
        case "day":
          if (!due(s.phaseEndsAt)) return null;
          beginVote(w);
          break;
        case "vote":
          if (!due(s.phaseEndsAt)) return null;
          tallyVotes(w);
          break;
        case "voteResult":
          if (!due(s.phaseEndsAt)) return null;
          beginNight(w);
          break;
        case "hunter":
          if (!s.hunter || !due(s.hunter.endsAt)) return null;
          s.hunterShot = { by: s.hunter.id, target: null };
          log(w, `🏹 พรานป่า ${nameOf(ctx, s.hunter.id)} ไม่ทันยิง`);
          continueAfter(w, s.hunter.then);
          break;
        default:
          return null;
      }
      return finish(w);
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** ผู้เล่นออก/ถูกเตะระหว่างเกม → นับเป็นตาย แล้วเช็กผลแพ้ชนะ */
export function werewolfRemovePlayer(ctx: Ctx, id: string): Changes | null {
  if (ctx.state?.kind !== "werewolf" || ctx.state.phase === "ended") return null;
  const w = getWork(ctx);
  if (!w.state.players.includes(id) || w.state.dead.includes(id)) return null;
  w.state.dead.push(id);
  log(w, `🚪 ${nameOf(ctx, id)} ออกจากเกม`);
  if (w.state.phase === "vote" && alive(w).every((x) => w.secret.votes[x])) {
    tallyVotes(w);
  } else if (w.state.phase === "hunter" && w.state.hunter?.id === id) {
    continueAfter(w, w.state.hunter.then);
  } else {
    const winner = checkWinner(w);
    if (winner) endGame(w, winner);
  }
  return finish(w);
}

