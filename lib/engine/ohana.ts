import { DRINK_PICK, MINI_GAMES, cardDrinkReason } from "../constants";
import type { Card, DrinkEvent, OhanaDraw, OhanaState, Rank, Suit } from "../types";
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

const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const REST_MS = 2 * 60 * 1000;

function buildDeck(decks: 1 | 2): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit });
  }
  return shuffle(cards);
}

function getState(ctx: Ctx): OhanaState {
  if (ctx.state?.kind !== "ohana") throw new GameError("ไม่ได้อยู่ในเกมไพ่");
  return clone(ctx.state);
}

export function startOhana(ctx: Ctx): Changes {
  const s = ctx.setup.ohana;
  const order = s.participants.filter((id) => isActive(ctx, id));
  if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
  const decks = s.decks === 2 ? 2 : 1;
  const deck = buildDeck(decks);
  const kRules = s.kRules.map((r, i) => r.trim() || `กติกา K ใบที่ ${i + 1}`);
  const state: OhanaState = {
    kind: "ohana",
    order,
    turn: 0,
    total: deck.length,
    remaining: deck.length,
    kRules,
    kCount: 0,
    current: null,
    history: [],
    buddies: [],
    rule: null,
    queen: null,
    jack: null,
    drinks: {},
    drinkBy: {},
    drinkLog: [],
    drinkSeq: 0,
    restTimer: null,
  };
  return {
    room: { stage: "playing", game: "ohana" },
    state,
    gameSecret: { deck },
    clearPlayerSecrets: true,
  };
}

const LOG_MAX = 40;
const MAX_AMOUNT = 20;

function amountOf(p: Payload): number {
  const n = Number(p.amount ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > MAX_AMOUNT) throw new GameError(`จำนวนแก้วต้องเป็น 1–${MAX_AMOUNT}`);
  return n;
}

/** ปรับยอดดื่มรวม + ยอดแยกตามสาเหตุ */
function applyDrinks(state: OhanaState, targets: string[], amount: number, reason: string, sign: 1 | -1) {
  const drinks = { ...(state.drinks ?? {}) };
  const drinkBy = { ...(state.drinkBy ?? {}) };
  for (const id of targets) {
    drinks[id] = Math.max(0, (drinks[id] ?? 0) + sign * amount);
    const mine = { ...(drinkBy[id] ?? {}) };
    const n = (mine[reason] ?? 0) + sign * amount;
    if (n > 0) mine[reason] = n;
    else delete mine[reason];
    drinkBy[id] = mine;
  }
  state.drinks = drinks;
  state.drinkBy = drinkBy;
}

/** บันทึกการดื่ม — ถ้าคนในวงบัดดี้โดน ทุกคนในวงดื่มตามจำนวนเดียวกัน คืนรายชื่อคนที่ดื่มจริง */
function recordDrinks(
  state: OhanaState,
  ctx: Ctx,
  e: { targets: string[]; amount: number; reason: string; drawId?: number; buddies?: boolean },
): string[] {
  const who = new Set(e.targets);
  if (e.buddies !== false && e.targets.some((t) => state.buddies.includes(t))) {
    for (const b of state.buddies) who.add(b);
  }
  const targets = [...who];
  if (targets.length === 0) return targets;
  applyDrinks(state, targets, e.amount, e.reason, 1);
  const id = (state.drinkSeq ?? 0) + 1;
  state.drinkSeq = id;
  const ev: DrinkEvent = { id, targets, amount: e.amount, reason: e.reason, by: ctx.actor, at: ctx.now };
  if (e.drawId !== undefined) ev.drawId = e.drawId;
  state.drinkLog = [ev, ...(state.drinkLog ?? [])].slice(0, LOG_MAX);
  return targets;
}

/** ยกเลิกยอดดื่มที่มาจากไพ่ใบหนึ่ง (ใช้ตอนแก้ไขคนดื่ม) */
function undoDraw(state: OhanaState, draw: OhanaDraw) {
  const ev = state.drinkLog?.find((x) => x.drawId === draw.id);
  if (ev) {
    applyDrinks(state, ev.targets, ev.amount, ev.reason, -1);
    state.drinkLog = state.drinkLog!.filter((x) => x.id !== ev.id);
  } else if (draw.drinkers) {
    applyDrinks(state, draw.drinkers, draw.drinkAmount ?? 1, cardDrinkReason(draw.card.rank), -1);
  }
}

function updateDraw(state: OhanaState, id: number, patch: Partial<OhanaDraw>) {
  if (state.current?.id === id) state.current = { ...state.current, ...patch };
  state.history = state.history.map((h) => (h.id === id ? { ...h, ...patch } : h));
}

export function ohanaAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);
  switch (type) {
    case "ohana.draw": {
      if (state.finishedAt) throw new GameError("เกมจบแล้ว");
      const turnPlayer = state.order[state.turn];
      if (ctx.actor !== turnPlayer && !isHost(ctx)) {
        throw new GameError("ยังไม่ถึงตาของคุณ");
      }
      if (typeof p.expectedId === "number" && (state.current?.id ?? 0) !== p.expectedId) {
        return null; // กดซ้ำ — มีคนจั่วไปแล้ว
      }
      if (state.remaining <= 0) throw new GameError("ไพ่หมดกองแล้ว!");
      const deck = (ctx.gameSecret?.deck ?? []) as Card[];
      const card = deck[state.total - state.remaining];
      if (!card) throw new GameError("สำรับไพ่ผิดพลาด ลองสับไพ่ใหม่");
      const by = turnPlayer;
      const draw: OhanaDraw = { id: (state.current?.id ?? 0) + 1, card, by };

      switch (card.rank) {
        case "A":
        case "5":
          draw.drinkers = recordDrinks(state, ctx, {
            targets: card.rank === "A" ? [by] : state.order,
            amount: 1,
            reason: cardDrinkReason(card.rank),
            drawId: draw.id,
          });
          break;
        case "7":
          if (state.buddies.length === 0) {
            draw.needBuddyPick = true;
          } else if (!state.buddies.includes(by)) {
            state.buddies.push(by);
            draw.buddyJoined = true;
          }
          break;
        case "8":
          state.restTimer = null;
          break;
        case "9":
          draw.miniGame = pick(MINI_GAMES);
          break;
        case "10":
          state.rule = { text: "", by };
          break;
        case "J":
          state.jack = by;
          break;
        case "Q":
          state.queen = by;
          break;
        case "K": {
          const idx = state.kCount % 4;
          draw.kIndex = idx;
          draw.kRule = state.kRules[idx];
          state.kCount += 1;
          break;
        }
      }

      if (DRINK_PICK[card.rank]) draw.needDrinkPick = true;

      state.remaining -= 1;
      state.current = draw;
      state.history = [draw, ...state.history].slice(0, 12);
      state.turn = (state.turn + 1) % state.order.length;
      return { state };
    }

    case "ohana.pickBuddy": {
      const drawId = p.drawId;
      const target = str(p, "target", 64);
      const draw = state.history.find((h) => h.id === drawId);
      if (!draw || !draw.needBuddyPick) throw new GameError("ไพ่ใบนี้เลือกบัดดี้ไปแล้ว");
      if (ctx.actor !== draw.by && !isHost(ctx)) throw new GameError("เฉพาะคนจั่วเท่านั้น");
      if (target === draw.by || !isActive(ctx, target)) throw new GameError("เลือกบัดดี้ไม่ถูกต้อง");
      for (const id of [draw.by, target]) if (!state.buddies.includes(id)) state.buddies.push(id);
      updateDraw(state, draw.id, { needBuddyPick: false });
      return { state };
    }

    case "ohana.pickDrinkers": {
      const draw = state.history.find((h) => h.id === p.drawId);
      const cfg = draw && DRINK_PICK[draw.card.rank];
      if (!draw || !cfg) throw new GameError("ไพ่ใบนี้ไม่ต้องเลือกคนดื่ม");
      if (ctx.actor !== draw.by && !isHost(ctx)) throw new GameError("เฉพาะคนจั่วหรือหัวหน้าห้องเท่านั้น");
      const raw = Array.isArray(p.targets) ? p.targets : [];
      const targets = [...new Set(raw.filter((t): t is string => typeof t === "string"))];
      for (const t of targets) {
        if (!isActive(ctx, t)) throw new GameError("มีผู้เล่นที่ไม่อยู่ในห้อง");
        if (t === draw.by && !cfg.allowDrawer) throw new GameError("ไม่ต้องเลือกตัวเอง");
      }
      if (targets.length < cfg.min || (cfg.max > 0 && targets.length > cfg.max)) {
        throw new GameError(cfg.min === cfg.max ? `ต้องเลือก ${cfg.min} คน` : `เลือกอย่างน้อย ${cfg.min} คน`);
      }
      const amount = cfg.amount ? amountOf(p) : 1;
      // แก้ไขได้: คืนยอดเดิมก่อนแล้วค่อยบวกใหม่
      undoDraw(state, draw);
      const drinkers = recordDrinks(state, ctx, {
        targets: cfg.withDrawer ? [draw.by, ...targets] : targets,
        amount,
        reason: cardDrinkReason(draw.card.rank),
        drawId: draw.id,
      });
      updateDraw(state, draw.id, { needDrinkPick: false, drinkers, drinkAmount: amount });
      return { state };
    }

    case "ohana.addDrinks": {
      const raw = Array.isArray(p.targets) ? p.targets : [];
      const targets = [...new Set(raw.filter((t): t is string => typeof t === "string"))];
      if (targets.length === 0) throw new GameError("เลือกคนที่ต้องดื่มก่อน");
      for (const t of targets) if (!isActive(ctx, t)) throw new GameError("มีผู้เล่นที่ไม่อยู่ในห้อง");
      const reason = str(p, "reason", 60).trim();
      if (!reason) throw new GameError("ระบุสาเหตุด้วย");
      recordDrinks(state, ctx, { targets, amount: amountOf(p), reason, buddies: p.buddies !== false });
      return { state };
    }

    case "ohana.undoDrink": {
      const ev = state.drinkLog?.find((x) => x.id === p.logId);
      if (!ev) throw new GameError("ไม่พบรายการนี้แล้ว");
      requireHost(ctx);
      applyDrinks(state, ev.targets, ev.amount, ev.reason, -1);
      state.drinkLog = state.drinkLog!.filter((x) => x.id !== ev.id);
      if (ev.drawId !== undefined) {
        const draw = state.history.find((h) => h.id === ev.drawId);
        if (draw) {
          updateDraw(state, draw.id, { drinkers: undefined, needDrinkPick: !!DRINK_PICK[draw.card.rank] });
        }
      }
      return { state };
    }

    case "ohana.setRule": {
      const text = str(p, "text", 140);
      if (!state.rule) throw new GameError("ยังไม่มีใครจั่วได้ไพ่ 10");
      if (ctx.actor !== state.rule.by && !isHost(ctx)) {
        throw new GameError("เฉพาะคนตั้งกฎหรือหัวหน้าห้องที่แก้ได้");
      }
      state.rule = { ...state.rule, text };
      return { state };
    }

    case "ohana.startRest": {
      state.restTimer = { by: ctx.actor, endsAt: ctx.now + REST_MS };
      return { state };
    }

    case "ohana.stopRest": {
      if (!state.restTimer) return null;
      state.restTimer = null;
      return { state };
    }

    case "ohana.skip": {
      requireHost(ctx);
      // กันกดยืนยันค้างไว้แล้วข้ามผิดคน (ตาเปลี่ยนไปแล้ว)
      if (typeof p.expectedTurn === "number" && p.expectedTurn !== state.turn) return null;
      state.turn = (state.turn + 1) % state.order.length;
      return { state };
    }

    case "ohana.finish": {
      requireHost(ctx);
      if (state.finishedAt) return null;
      state.finishedAt = ctx.now;
      state.restTimer = null;
      return { state };
    }

    case "ohana.resume": {
      requireHost(ctx);
      if (!state.finishedAt) return null;
      state.finishedAt = null;
      return { state };
    }

    case "ohana.newRound":
    case "ohana.reshuffle": {
      requireHost(ctx);
      const decks = state.total > 52 ? 2 : 1;
      const deck = buildDeck(decks);
      const next: OhanaState = {
        ...state,
        total: deck.length,
        remaining: deck.length,
        kCount: 0,
        current: null,
        history: [],
        buddies: [],
        rule: null,
        queen: null,
        jack: null,
        restTimer: null,
        finishedAt: null,
        ...(type === "ohana.newRound" ? { drinks: {}, drinkBy: {}, drinkLog: [] } : {}),
      };
      return { state: next, gameSecret: { deck } };
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** เรียกเมื่อมีผู้เล่นออก/ถูกเตะระหว่างเกม */
/** ผู้เล่นที่เข้ามาระหว่างเกม → ต่อท้ายคิวจั่วไพ่ */
export function ohanaAddPlayer(state: OhanaState, id: string): OhanaState {
  if (state.order.includes(id)) return state;
  return { ...state, order: [...state.order, id] };
}

export function ohanaRemovePlayer(state: OhanaState, id: string): OhanaState {
  const idx = state.order.indexOf(id);
  if (idx === -1) return state;
  const order = state.order.filter((x) => x !== id);
  let turn = state.turn;
  if (idx < turn) turn -= 1;
  if (order.length === 0) turn = 0;
  else turn = turn % order.length;
  return {
    ...state,
    order,
    turn,
    buddies: state.buddies.filter((x) => x !== id),
    queen: state.queen === id ? null : state.queen,
    jack: state.jack === id ? null : (state.jack ?? null),
  };
}
