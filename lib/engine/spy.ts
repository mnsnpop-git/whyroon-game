import { SPY_LOCATIONS } from "../spy-locations";
import type { SpyEndReason, SpyResult, SpySecret, SpyState } from "../types";
import {
  type Changes,
  type Ctx,
  GameError,
  type Payload,
  clone,
  isActive,
  isHost,
  pick,
  requireHost,
  shuffle,
  str,
} from "./core";

export const SPY_MIN_PLAYERS = 3;
const ALLOWED_MINUTES = [3, 5, 8, 10];
/** ให้เวลาหลังหมดเวลาเล็กน้อย (นาฬิกาแต่ละเครื่องคลาดกัน) */
const TIMEOUT_GRACE_MS = 500;

/** จำนวนสายลับสูงสุดที่ตั้งได้: ต้องน้อยกว่าผู้เล่นทั้งหมด (เช่น 4 คน → สูงสุด 2) */
export function maxSpies(players: number) {
  return Math.max(1, players - 2);
}

export function clampSpies(spies: number, players: number) {
  const n = Number.isFinite(spies) ? Math.round(spies) : 1;
  return Math.min(maxSpies(players), Math.max(1, n));
}

interface SpyGameSecret {
  spies: string[];
  location: number;
  roles: Record<string, string>;
}

function getState(ctx: Ctx): SpyState {
  if (ctx.state?.kind !== "spy") throw new GameError("ไม่ได้อยู่ในเกมใครคือสายลับ");
  return clone(ctx.state);
}

function getSecret(ctx: Ctx): SpyGameSecret {
  const s = ctx.gameSecret as Partial<SpyGameSecret> | null;
  if (!s || !Array.isArray(s.spies) || typeof s.location !== "number" || !s.roles) {
    throw new GameError("ข้อมูลเกมเสียหาย ให้หัวหน้าห้องเริ่มรอบใหม่");
  }
  return s as SpyGameSecret;
}

/** แจกบทบาท: สุ่มสถานที่ + สุ่มสายลับ แต่ละคนได้ความลับเฉพาะของตัวเอง */
function deal(order: string[], spyCount: number, avoidLocation?: number) {
  let location = Math.floor(Math.random() * SPY_LOCATIONS.length);
  if (avoidLocation !== undefined && SPY_LOCATIONS.length > 1) {
    while (location === avoidLocation) location = Math.floor(Math.random() * SPY_LOCATIONS.length);
  }
  const spies = shuffle(order).slice(0, clampSpies(spyCount, order.length));
  const rolePool = shuffle(SPY_LOCATIONS[location].roles);
  const roles: Record<string, string> = {};
  const playerSecrets: Record<string, SpySecret> = {};
  let r = 0;
  for (const id of order) {
    if (spies.includes(id)) {
      roles[id] = "สายลับ";
      // สายลับไม่รู้สถานที่ และไม่รู้ว่าใครเป็นสายลับอีกคน
      playerSecrets[id] = { kind: "spy", spy: true, location: null, role: null };
    } else {
      const role = rolePool[r++ % rolePool.length];
      roles[id] = role;
      playerSecrets[id] = { kind: "spy", spy: false, location, role };
    }
  }
  return { secret: { spies, location, roles } satisfies SpyGameSecret, playerSecrets };
}

function newRound(ctx: Ctx, order: string[], minutes: number, spyCount: number, prev?: SpyState): Changes {
  const avoid = prev?.result?.location;
  const { secret, playerSecrets } = deal(order, spyCount, avoid);
  const round = (prev?.round ?? 0) + 1;
  const state: SpyState = {
    kind: "spy",
    round,
    order,
    minutes,
    spyCount: secret.spies.length,
    phase: "playing",
    startsAt: ctx.now,
    endsAt: ctx.now + minutes * 60_000,
    pausedAt: null,
    firstAsker: pick(order),
    accusation: null,
    accusationSeq: prev?.accusationSeq ?? 0,
    accusedBy: [],
    lastVote: null,
    result: null,
    wins: prev?.wins ?? { spies: 0, locals: 0 },
    drinks: prev?.drinks ?? {},
    penaltyRecorded: false,
  };
  return {
    room: { stage: "playing", game: "spy" },
    state,
    gameSecret: secret as unknown as Record<string, unknown>,
    clearPlayerSecrets: true,
    playerSecrets,
  };
}

export function startSpy(ctx: Ctx): Changes {
  const s = ctx.setup.spy;
  const order = s.participants.filter((id) => isActive(ctx, id));
  if (order.length < SPY_MIN_PLAYERS) throw new GameError(`ต้องมีผู้เล่นอย่างน้อย ${SPY_MIN_PLAYERS} คน`);
  const minutes = ALLOWED_MINUTES.includes(s.minutes) ? s.minutes : 5;
  return newRound(ctx, order, minutes, s.spies);
}

/** จบรอบ: เปิดเผยทุกอย่างลง state สาธารณะ */
function endRound(
  state: SpyState,
  ctx: Ctx,
  secret: SpyGameSecret,
  winner: SpyResult["winner"],
  reason: SpyEndReason,
  extra: Partial<Pick<SpyResult, "accused" | "guess">> = {},
): Changes {
  const result: SpyResult = {
    winner,
    reason,
    spies: secret.spies,
    location: secret.location,
    roles: secret.roles,
    accused: extra.accused ?? null,
    guess: extra.guess ?? null,
    at: ctx.now,
  };
  state.phase = "ended";
  state.result = result;
  state.accusation = null;
  if (state.pausedAt === null) state.pausedAt = ctx.now; // หยุดนาฬิกาไว้ที่เวลาจบ
  if (winner) state.wins = { ...state.wins, [winner]: state.wins[winner] + 1 };
  return { state };
}

/** ใครโหวตได้: ผู้เล่นในรอบที่ยังอยู่ ยกเว้นคนที่ถูกชี้ */
function voters(state: SpyState, ctx: Ctx, target: string) {
  return state.order.filter((id) => id !== target && isActive(ctx, id));
}

/** นับโหวต: เกินครึ่งของคนที่โหวตได้ → ตัดสิน; ถ้าเป็นไปไม่ได้แล้ว → ไม่ผ่าน */
function tally(state: SpyState, ctx: Ctx, secret: SpyGameSecret): Changes {
  const acc = state.accusation!;
  const list = voters(state, ctx, acc.target);
  const yes = list.filter((id) => acc.votes[id] === true).length;
  const no = list.filter((id) => acc.votes[id] === false).length;
  const need = Math.floor(list.length / 2) + 1;
  if (yes >= need) {
    const isSpy = secret.spies.includes(acc.target);
    return endRound(state, ctx, secret, isSpy ? "locals" : "spies", isSpy ? "caught" : "wrongAccuse", {
      accused: acc.target,
    });
  }
  if (list.length - no < need || yes + no >= list.length) {
    // โหวตไม่ผ่าน → เล่นต่อ (เดินเวลาต่อจากที่หยุดไว้)
    state.lastVote = { by: acc.by, target: acc.target, yes, no, at: ctx.now };
    state.accusation = null;
    resumeClock(state, ctx);
  }
  return { state };
}

function resumeClock(state: SpyState, ctx: Ctx) {
  if (state.pausedAt === null) return;
  const shift = ctx.now - state.pausedAt;
  state.endsAt += shift;
  state.startsAt += shift;
  state.pausedAt = null;
}

/** ผู้แพ้ของรอบ (ใช้กับบทลงโทษดื่ม) */
export function spyLosers(state: SpyState): string[] {
  const r = state.result;
  if (!r || !r.winner) return [];
  if (r.winner === "locals") return r.spies;
  return state.order.filter((id) => !r.spies.includes(id));
}

export function spyAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);
  const me = ctx.actor;
  const inRound = state.order.includes(me);

  switch (type) {
    case "spy.accuse": {
      if (state.phase !== "playing") throw new GameError("รอบนี้จบแล้ว");
      if (state.accusation) throw new GameError("กำลังโหวตกันอยู่ รอให้จบก่อนนะ");
      if (state.pausedAt !== null) throw new GameError("เกมหยุดชั่วคราวอยู่");
      if (!inRound) throw new GameError("คุณไม่ได้อยู่ในรอบนี้");
      if (ctx.now > state.endsAt + TIMEOUT_GRACE_MS) throw new GameError("หมดเวลาแล้ว");
      if (state.accusedBy.includes(me)) throw new GameError("คุณใช้สิทธิ์ชี้ตัวไปแล้วในรอบนี้");
      const target = str(p, "playerId", 64);
      if (target === me) throw new GameError("ชี้ตัวเองไม่ได้นะ 😅");
      if (!state.order.includes(target) || !isActive(ctx, target)) throw new GameError("ไม่พบผู้เล่นคนนี้");
      state.accusationSeq += 1;
      state.accusation = { id: state.accusationSeq, by: me, target, votes: { [me]: true }, at: ctx.now };
      state.accusedBy = [...state.accusedBy, me];
      state.lastVote = null;
      state.pausedAt = ctx.now; // หยุดเวลาระหว่างโหวต
      return tally(state, ctx, getSecret(ctx));
    }

    case "spy.vote": {
      const acc = state.accusation;
      if (state.phase !== "playing" || !acc) return null;
      if (typeof p.accusationId === "number" && p.accusationId !== acc.id) return null; // โหวตเก่า
      if (!inRound) throw new GameError("คุณไม่ได้อยู่ในรอบนี้");
      if (me === acc.target) throw new GameError("คนที่ถูกชี้โหวตไม่ได้");
      if (typeof p.agree !== "boolean") throw new GameError("ข้อมูลโหวตไม่ถูกต้อง");
      if (acc.votes[me] === p.agree) return null;
      acc.votes = { ...acc.votes, [me]: p.agree };
      return tally(state, ctx, getSecret(ctx));
    }

    case "spy.cancelVote": {
      const acc = state.accusation;
      if (!acc) return null;
      if (me !== acc.by && !isHost(ctx)) throw new GameError("ยกเลิกได้เฉพาะคนชี้ หรือหัวหน้าห้อง");
      state.accusation = null;
      // ยกเลิกเอง = คืนสิทธิ์ชี้ตัว
      state.accusedBy = state.accusedBy.filter((id) => id !== acc.by);
      resumeClock(state, ctx);
      return { state };
    }

    case "spy.guessLocation": {
      if (state.phase !== "playing") throw new GameError("รอบนี้จบแล้ว");
      if (state.accusation) throw new GameError("กำลังโหวตกันอยู่ รอให้จบก่อนนะ");
      const secret = getSecret(ctx);
      if (!secret.spies.includes(me)) throw new GameError("เฉพาะสายลับเท่านั้นที่ทายสถานที่ได้");
      const loc = p.location;
      if (typeof loc !== "number" || !Number.isInteger(loc) || !SPY_LOCATIONS[loc]) {
        throw new GameError("เลือกสถานที่ไม่ถูกต้อง");
      }
      const right = loc === secret.location;
      return endRound(state, ctx, secret, right ? "spies" : "locals", right ? "spyGuessed" : "spyMissed", {
        guess: { by: me, location: loc },
      });
    }

    case "spy.timeout": {
      if (state.phase !== "playing" || state.accusation || state.pausedAt !== null) return null;
      if (ctx.now < state.endsAt - TIMEOUT_GRACE_MS) return null; // ยังไม่หมดเวลา
      return endRound(state, ctx, getSecret(ctx), "spies", "timeout");
    }

    case "spy.pause": {
      requireHost(ctx);
      if (state.phase !== "playing" || state.pausedAt !== null) return null;
      state.pausedAt = ctx.now;
      return { state };
    }

    case "spy.resume": {
      requireHost(ctx);
      if (state.phase !== "playing" || state.accusation || state.pausedAt === null) return null;
      resumeClock(state, ctx);
      return { state };
    }

    case "spy.reveal": {
      requireHost(ctx);
      if (state.phase !== "playing") return null;
      return endRound(state, ctx, getSecret(ctx), null, "host");
    }

    case "spy.recordPenalty": {
      requireHost(ctx);
      if (state.phase !== "ended" || state.penaltyRecorded) return null;
      const losers = spyLosers(state);
      if (losers.length === 0) return null;
      const drinks = { ...state.drinks };
      for (const id of losers) drinks[id] = (drinks[id] ?? 0) + 1;
      state.drinks = drinks;
      state.penaltyRecorded = true;
      return { state };
    }

    case "spy.playAgain": {
      requireHost(ctx);
      if (state.phase !== "ended") return null;
      // ใช้คิวเดิม + คนที่เข้ามาใหม่ ตัดคนที่ออกไปแล้ว
      const order = state.order.filter((id) => isActive(ctx, id));
      for (const id of ctx.setup.spy.participants) if (isActive(ctx, id) && !order.includes(id)) order.push(id);
      if (order.length < SPY_MIN_PLAYERS) throw new GameError(`ต้องมีผู้เล่นอย่างน้อย ${SPY_MIN_PLAYERS} คน`);
      return newRound(ctx, order, state.minutes, ctx.setup.spy.spies, state);
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** คนเข้าห้องระหว่างเกม (เข้าได้เฉพาะตอนจบรอบ) → ได้เล่นรอบถัดไป */
export function spyAddPlayer(state: SpyState, id: string): SpyState {
  if (state.phase !== "ended" || state.order.includes(id)) return state;
  return { ...state, order: [...state.order, id] };
}

/** ผู้เล่นออกกลางรอบ */
export function spyRemovePlayer(ctx: Ctx, id: string): Changes | null {
  if (ctx.state?.kind !== "spy") return null;
  const state = clone(ctx.state);
  if (!state.order.includes(id)) return null;
  if (state.phase === "ended") {
    state.order = state.order.filter((x) => x !== id);
    return { state };
  }
  let secret: SpyGameSecret;
  try {
    secret = getSecret(ctx);
  } catch {
    // ข้อมูลลับเสียหาย: อย่าขวางการออกจากห้อง แค่เอาออกจากคิว
    state.order = state.order.filter((x) => x !== id);
    return { state };
  }
  state.order = state.order.filter((x) => x !== id);
  const spiesLeft = secret.spies.filter((s) => s !== id && state.order.includes(s));
  if (spiesLeft.length === 0) return endRound(state, ctx, secret, null, "spyLeft");
  if (state.order.length < SPY_MIN_PLAYERS) return endRound(state, ctx, secret, null, "tooFew");

  const acc = state.accusation;
  if (acc) {
    if (acc.by === id || acc.target === id) {
      state.accusation = null;
      resumeClock(state, ctx);
    } else {
      const { [id]: _drop, ...rest } = acc.votes;
      void _drop;
      acc.votes = rest;
      return tally(state, ctx, secret);
    }
  }
  return { state };
}
