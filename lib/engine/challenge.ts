import { CHALLENGE_DECKS } from "../challenge-cards";
import type { ChallengeActive, ChallengeDeck, ChallengeFail, ChallengeState } from "../types";
import {
  type Changes,
  type Ctx,
  GameError,
  type Payload,
  clone,
  isActive,
  isHost,
  pick,
  randomBetween,
  requireHost,
  shuffle,
  str,
} from "./core";

const FAIL_LOG_MAX = 60;
/** กันหลายคนกด "ทำพลาด" ให้คนเดียวกันพร้อมๆ กัน (นับครั้งเดียว) */
const FAIL_DEDUPE_MS = 2500;
/** จำการ์ดล่าสุดกี่ใบ ให้เลือกตอนแจ้งทำพลาด (เผื่อมีคนทำผิดการ์ดห้ามใบก่อนหน้า) */
const RECENT_MAX = 5;

/** ลำดับการ์ดของแต่ละสำรับ (เก็บเป็นความลับบนเซิร์ฟเวอร์ ไม่ให้ใครแอบดูใบถัดไป) */
interface ChallengeSecret {
  order: Record<ChallengeDeck, number[]>;
}

function newOrder(deck: ChallengeDeck, avoidFirst?: number) {
  const order = shuffle(CHALLENGE_DECKS[deck].map((_, i) => i));
  // สลับสำรับใหม่แล้วไม่ให้ใบแรกซ้ำกับใบที่เพิ่งจั่วไป
  if (avoidFirst !== undefined && order.length > 1 && order[0] === avoidFirst) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

/** การ์ดห้ามใบล่าสุดที่แต่ละคนถืออยู่ (key = ผู้เล่น) */
export function heldForbidden(state: ChallengeState): Record<string, { id: number; text: string; at: number }> {
  if (state.lastForbidden) return state.lastForbidden;
  // ห้องที่เริ่มก่อนมีฟิลด์นี้: ใช้การ์ดล่าสุดเท่าที่จำได้แทน
  const map: Record<string, { id: number; text: string; at: number }> = {};
  for (const c of [...(state.recent ?? []), ...(state.active ? [state.active] : [])].reverse()) {
    if (c.deck === "forbidden") map[c.by] = { id: c.id, text: c.text, at: c.at };
  }
  return map;
}

/** การ์ดที่เลือกได้ตอนแจ้ง "ทำพลาด": ใบบนจอ + การ์ดห้ามที่ทุกคนถืออยู่ (ใหม่สุดก่อน) */
export function failCardChoices(state: ChallengeState): ChallengeActive[] {
  const out: ChallengeActive[] = state.active ? [state.active] : [];
  const held = Object.entries(heldForbidden(state)).sort((a, b) => b[1].id - a[1].id);
  for (const [by, c] of held) {
    if (out.some((x) => x.id === c.id)) continue;
    out.push({ id: c.id, deck: "forbidden", index: -1, text: c.text, by, at: c.at, endsAt: null });
  }
  return out;
}

/** ไม่ให้ออกสำรับเดียวกันติดกันเกินกี่ใบ */
const MAX_STREAK = 2;

function randomDeck(state: ChallengeState): ChallengeDeck {
  const c = state.remaining.challenge;
  const f = state.remaining.forbidden;
  const last = (state.recent ?? []).slice(0, MAX_STREAK);
  if (last.length === MAX_STREAK && last.every((x) => x.deck === last[0].deck)) {
    const other: ChallengeDeck = last[0].deck === "challenge" ? "forbidden" : "challenge";
    // บังคับสลับเฉพาะเมื่ออีกสำรับยังมีการ์ดเหลือ (ไม่สลับสำรับใหม่ก่อนเวลา)
    if (state.remaining[other] > 0) return other;
  }
  if (c + f <= 0) return pick(["challenge", "forbidden"] as const);
  return randomBetween(1, c + f) <= c ? "challenge" : "forbidden";
}

function getState(ctx: Ctx): ChallengeState {
  if (ctx.state?.kind !== "challenge") throw new GameError("ไม่ได้อยู่ในเกมท้าทาย & ห้าม");
  return clone(ctx.state);
}

function getSecret(ctx: Ctx): ChallengeSecret {
  const s = ctx.gameSecret as unknown as ChallengeSecret | null;
  if (s?.order?.challenge && s.order.forbidden) return clone(s);
  // กันข้อมูลหาย: สร้างสำรับใหม่
  return { order: { challenge: newOrder("challenge"), forbidden: newOrder("forbidden") } };
}

function freshState(order: string[], timers: boolean): ChallengeState {
  return {
    kind: "challenge",
    order,
    turn: 0,
    timers,
    remaining: { challenge: CHALLENGE_DECKS.challenge.length, forbidden: CHALLENGE_DECKS.forbidden.length },
    shuffles: 0,
    drawn: 0,
    drawnBy: { challenge: 0, forbidden: 0 },
    active: null,
    recent: [],
    lastForbidden: {},
    fails: {},
    caused: {},
    failLog: [],
    failSeq: 0,
    finishedAt: null,
  };
}

function freshSecret(): ChallengeSecret {
  return { order: { challenge: newOrder("challenge"), forbidden: newOrder("forbidden") } };
}

function recordFail(state: ChallengeState, ctx: Ctx, player: string, card: ChallengeActive | null, drank = false) {
  state.failSeq += 1;
  const entry: ChallengeFail = {
    id: state.failSeq,
    player,
    by: ctx.actor,
    cardId: card?.id ?? null,
    cardBy: card?.by ?? null,
    deck: card?.deck ?? null,
    text: card?.text ?? null,
    at: ctx.now,
    ...(drank ? { drank: true } : {}),
  };
  state.fails[player] = (state.fails[player] ?? 0) + 1;
  // เจ้าของการ์ดได้แต้ม "ทำให้พลาด" (ไม่นับพลาดการ์ดตัวเอง)
  if (entry.cardBy && entry.cardBy !== player) {
    state.caused = { ...(state.caused ?? {}), [entry.cardBy]: (state.caused?.[entry.cardBy] ?? 0) + 1 };
  }
  state.failLog = [entry, ...state.failLog].slice(0, FAIL_LOG_MAX);
}

export function startChallenge(ctx: Ctx): Changes {
  const s = ctx.setup.challenge;
  const order = s.participants.filter((id) => isActive(ctx, id));
  if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
  return {
    room: { stage: "playing", game: "challenge" },
    state: freshState(order, s.timers !== false),
    gameSecret: freshSecret(),
    clearPlayerSecrets: true,
  };
}

export function challengeAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);

  switch (type) {
    case "challenge.draw": {
      if (state.finishedAt) throw new GameError("เกมจบแล้ว");
      // ไม่ระบุสำรับ = สุ่ม (ถ่วงตามจำนวนใบที่เหลือ เหมือนจั่วจากกองรวม 80 ใบ)
      const deck: ChallengeDeck =
        p.deck === "challenge" || p.deck === "forbidden" ? p.deck : randomDeck(state);
      if (state.order.length === 0) throw new GameError("ไม่มีผู้เล่นในคิว");
      const turnPlayer = state.order[state.turn % state.order.length];
      if (ctx.actor !== turnPlayer && !isHost(ctx)) throw new GameError("ยังไม่ถึงตาของคุณ");
      // กดซ้ำ / มีคนจั่วไปก่อนแล้ว
      if (typeof p.expectedId === "number" && (state.active?.id ?? 0) !== p.expectedId) return null;

      const secret = getSecret(ctx);
      const cards = CHALLENGE_DECKS[deck];
      if (state.remaining[deck] <= 0) {
        // สำรับหมด → สลับสำรับใหม่อัตโนมัติ
        const last = state.active?.deck === deck ? state.active.index : undefined;
        secret.order[deck] = newOrder(deck, last);
        state.remaining[deck] = cards.length;
        state.shuffles += 1;
      }
      const pos = cards.length - state.remaining[deck];
      const index = secret.order[deck][pos];
      const card = cards[index];
      if (!card) throw new GameError("สำรับการ์ดผิดพลาด");
      state.remaining[deck] -= 1;
      state.drawn += 1;
      state.drawnBy[deck] += 1;
      state.active = {
        id: state.drawn, // นับต่อเนื่องทั้งเกม (ไม่รีเซ็ตแม้ล้างการ์ด)
        deck,
        index,
        text: card.text,
        by: turnPlayer,
        at: ctx.now,
        endsAt: null, // การ์ดคำสั่งเริ่มนับเวลาเมื่อกด "รับคำท้า"
        seconds: state.timers && card.seconds ? card.seconds : null,
        startedAt: null,
        response: null,
      };
      state.recent = [state.active, ...(state.recent ?? [])].slice(0, RECENT_MAX);
      if (deck === "forbidden") {
        state.lastForbidden = {
          ...(state.lastForbidden ?? {}),
          [turnPlayer]: { id: state.active.id, text: card.text, at: ctx.now },
        };
      }
      state.turn = (state.turn + 1) % state.order.length;
      return { state, gameSecret: secret };
    }

    case "challenge.fail": {
      if (state.finishedAt) throw new GameError("เกมจบแล้ว");
      const player = str(p, "playerId", 64);
      if (!state.order.includes(player) && !isActive(ctx, player)) throw new GameError("ไม่พบผู้เล่นคนนี้");
      // พลาดเพราะการ์ดใบไหน: ไม่ระบุ = การ์ดบนจอตอนนี้
      let card = state.active;
      if (typeof p.cardId === "number") {
        const found =
          failCardChoices(state).find((c) => c.id === p.cardId) ??
          (state.recent ?? []).find((c) => c.id === p.cardId);
        if (!found) throw new GameError("การ์ดใบนั้นเก่าเกินไปแล้ว เลือกใบอื่นนะ");
        card = found;
      }
      const last = state.failLog[0];
      if (
        last &&
        last.player === player &&
        (last.cardId ?? null) === (card?.id ?? null) &&
        ctx.now - last.at < FAIL_DEDUPE_MS
      ) {
        return null; // มีคนกดแจ้งคนนี้ (การ์ดใบเดียวกัน) ไปเมื่อกี้แล้ว
      }
      recordFail(state, ctx, player, card);
      return { state };
    }

    case "challenge.respond": {
      if (state.finishedAt) throw new GameError("เกมจบแล้ว");
      const active = state.active;
      if (!active || active.id !== p.cardId) return null; // การ์ดเปลี่ยนไปแล้ว
      if (active.deck !== "challenge") throw new GameError("เลือกได้เฉพาะการ์ดคำสั่ง");
      if (active.response) return null; // เลือกไปแล้ว
      if (ctx.actor !== active.by && !isHost(ctx)) throw new GameError("เฉพาะคนถือการ์ด หรือหัวหน้าห้อง");
      if (p.choice === "accept") {
        state.active = {
          ...active,
          response: "accepted",
          startedAt: active.seconds ? ctx.now : null,
          endsAt: active.seconds ? ctx.now + active.seconds * 1000 : null,
        };
      } else if (p.choice === "drink") {
        state.active = { ...active, response: "drank", endsAt: null };
        recordFail(state, ctx, active.by, state.active, true);
      } else {
        throw new GameError("ตัวเลือกไม่ถูกต้อง");
      }
      return { state };
    }

    case "challenge.undoFail": {
      const id = p.logId;
      const entry = state.failLog.find((x) => x.id === id);
      if (!entry) return null;
      if (entry.by !== ctx.actor && !isHost(ctx)) {
        throw new GameError("ลบได้เฉพาะคนที่กดแจ้ง หรือหัวหน้าห้อง");
      }
      state.failLog = state.failLog.filter((x) => x.id !== id);
      state.fails[entry.player] = Math.max(0, (state.fails[entry.player] ?? 0) - 1);
      // ยกเลิก "ยอมดื่ม" → ให้คนถือการ์ดเลือกใหม่ได้
      const cur = state.active;
      if (entry.drank && cur && cur.id === entry.cardId) state.active = { ...cur, response: null };
      if (entry.cardBy && entry.cardBy !== entry.player && state.caused) {
        state.caused = { ...state.caused, [entry.cardBy]: Math.max(0, (state.caused[entry.cardBy] ?? 0) - 1) };
      }
      return { state };
    }

    case "challenge.skip": {
      requireHost(ctx);
      if (typeof p.expectedTurn === "number" && p.expectedTurn !== state.turn) return null;
      if (state.order.length === 0) return null;
      state.turn = (state.turn + 1) % state.order.length;
      return { state };
    }

    case "challenge.clearCard": {
      requireHost(ctx);
      if (!state.active) return null;
      state.active = null;
      return { state };
    }

    case "challenge.finish": {
      requireHost(ctx);
      if (state.finishedAt) return null;
      state.finishedAt = ctx.now;
      return { state };
    }

    case "challenge.resume": {
      requireHost(ctx);
      if (!state.finishedAt) return null;
      state.finishedAt = null;
      return { state };
    }

    case "challenge.newGame": {
      requireHost(ctx);
      const order = state.order.filter((id) => isActive(ctx, id));
      if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
      return { state: freshState(order, state.timers), gameSecret: freshSecret() };
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** ผู้เล่นที่เข้ามาระหว่างเกม → ต่อท้ายคิว */
export function challengeAddPlayer(state: ChallengeState, id: string): ChallengeState {
  if (state.order.includes(id)) return state;
  return { ...state, order: [...state.order, id] };
}

/** ผู้เล่นออก/ถูกเตะ → เอาออกจากคิว (สถิติทำพลาดยังเก็บไว้แสดงตอนสรุป) */
export function challengeRemovePlayer(state: ChallengeState, id: string): ChallengeState {
  const idx = state.order.indexOf(id);
  if (idx === -1) return state;
  const order = state.order.filter((x) => x !== id);
  let turn = state.turn;
  if (idx < turn) turn -= 1;
  turn = order.length === 0 ? 0 : turn % order.length;
  return { ...state, order, turn };
}
