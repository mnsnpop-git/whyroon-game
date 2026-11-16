import { MINI_GAMES } from "../constants";
import type { Card, OhanaDraw, OhanaState, Rank, Suit } from "../types";
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
    restTimer: null,
  };
  return {
    room: { stage: "playing", game: "ohana" },
    state,
    gameSecret: { deck },
    clearPlayerSecrets: true,
  };
}

function updateDraw(state: OhanaState, id: number, patch: Partial<OhanaDraw>) {
  if (state.current?.id === id) state.current = { ...state.current, ...patch };
  state.history = state.history.map((h) => (h.id === id ? { ...h, ...patch } : h));
}

export function ohanaAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);
  switch (type) {
    case "ohana.draw": {
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
      state.turn = (state.turn + 1) % state.order.length;
      return { state };
    }

    case "ohana.clearBuddies": {
      requireHost(ctx);
      state.buddies = [];
      return { state };
    }

    case "ohana.clearQueen": {
      requireHost(ctx);
      state.queen = null;
      return { state };
    }

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
        restTimer: null,
      };
      return { state: next, gameSecret: { deck } };
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** เรียกเมื่อมีผู้เล่นออก/ถูกเตะระหว่างเกม */
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
  };
}
