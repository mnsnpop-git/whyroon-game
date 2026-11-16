import type { GuessResult, GuessSecret, GuessState } from "../types";
import {
  type Changes,
  type Ctx,
  GameError,
  type Payload,
  clone,
  isActive,
  isHost,
  requireHost,
  str,
} from "./core";

const WORD_MAX = 40;
const CHAT_MAX = 40;
const CHAT_TEXT_MAX = 40;
const ALLOWED_SECONDS = [30, 60, 90, 120];

/** เทียบคำแบบไม่สนช่องว่าง ตัวพิมพ์เล็ก/ใหญ่ และเครื่องหมาย */
export function normalizeGuess(text: string) {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\s\-_.,!?'"“”‘’()[\]{}:;/\\]+/g, "");
}

function getState(ctx: Ctx): GuessState {
  if (ctx.state?.kind !== "guess") throw new GameError("ไม่ได้อยู่ในเกมใบ้คำ-ทายคำ");
  return clone(ctx.state);
}

function secretWord(ctx: Ctx): string | null {
  const w = (ctx.gameSecret as { word?: unknown } | null)?.word;
  return typeof w === "string" && w ? w : null;
}

export function guessTotalTurns(s: Pick<GuessState, "order" | "laps">) {
  return s.order.length * s.laps;
}

export function guessGiver(s: Pick<GuessState, "order" | "turnNo">) {
  return s.order.length ? s.order[s.turnNo % s.order.length] : null;
}

function emptyState(order: string[], seconds: number, laps: number, giverPoint: boolean, drinks = {}): GuessState {
  return {
    kind: "guess",
    order,
    seconds,
    laps,
    giverPoint,
    turnNo: 0,
    phase: "setup",
    round: null,
    reveal: null,
    scores: Object.fromEntries(order.map((id) => [id, 0])),
    giverScores: {},
    history: [],
    chat: [],
    chatSeq: 0,
    drinks,
    penaltyRecorded: false,
    finishedAt: null,
  };
}

export function startGuess(ctx: Ctx): Changes {
  const s = ctx.setup.guess;
  const order = s.participants.filter((id) => isActive(ctx, id));
  if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
  const seconds = ALLOWED_SECONDS.includes(s.seconds) ? s.seconds : 60;
  const laps = [1, 2, 3].includes(s.laps) ? s.laps : 1;
  return {
    room: { stage: "playing", game: "guess" },
    state: emptyState(order, seconds, laps, s.giverPoint !== false),
    gameSecret: null,
    clearPlayerSecrets: true,
  };
}

/** จบตาปัจจุบัน → เฉลยคำ ให้คะแนน แล้วรอกด "ตาถัดไป" */
function endTurn(ctx: Ctx, state: GuessState, winner: string | null, result: GuessResult["result"]): Changes {
  const giver = state.round?.giver ?? guessGiver(state) ?? "";
  const word = secretWord(ctx) ?? "?";
  if (winner) {
    state.scores[winner] = (state.scores[winner] ?? 0) + 1;
    if (state.giverPoint) {
      state.scores[giver] = (state.scores[giver] ?? 0) + 1;
    }
    state.giverScores[giver] = (state.giverScores[giver] ?? 0) + 1;
  }
  const res: GuessResult = { turnNo: state.turnNo, giver, word, winner, result };
  state.reveal = res;
  state.history = [...state.history, res];
  state.round = null;
  state.phase = "reveal";
  return { state, gameSecret: null, clearPlayerSecrets: true };
}

export function guessAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);
  const giver = guessGiver(state);

  switch (type) {
    // ---------- ช่วงที่ 1: คนใบ้ตั้งคำลับ ----------
    case "guess.setWord": {
      if (state.phase !== "setup") return null;
      if (ctx.actor !== giver) throw new GameError("เฉพาะคนใบ้ตานี้เท่านั้น");
      const word = str(p, "word", 200).replace(/\s+/g, " ");
      if (!word) throw new GameError("พิมพ์คำลับก่อนนะ");
      if (word.length > WORD_MAX) throw new GameError(`คำลับยาวได้ไม่เกิน ${WORD_MAX} ตัวอักษร`);
      if (!normalizeGuess(word)) throw new GameError("คำลับต้องมีตัวอักษร");
      state.phase = "guessing";
      state.round = { giver: ctx.actor, startsAt: ctx.now, endsAt: ctx.now + state.seconds * 1000 };
      state.chat = [];
      state.reveal = null;
      const secret: GuessSecret = { kind: "guess", word };
      return {
        state,
        gameSecret: { word },
        clearPlayerSecrets: true,
        playerSecrets: { [ctx.actor]: secret },
      };
    }

    // ---------- ช่วงที่ 2: ทายคำ ----------
    case "guess.guess": {
      if (state.phase !== "guessing" || !state.round) return null;
      if (ctx.actor === state.round.giver) throw new GameError("คนใบ้ทายเองไม่ได้นะ 😆");
      if (ctx.now > state.round.endsAt + 500) return null;
      const text = str(p, "text", 200).replace(/\s+/g, " ").slice(0, CHAT_TEXT_MAX);
      if (!text) return null;
      state.chatSeq += 1;
      const word = secretWord(ctx);
      const hit = !!word && normalizeGuess(text) === normalizeGuess(word);
      state.chat = [...state.chat, { id: state.chatSeq, player: ctx.actor, text, at: ctx.now, ...(hit ? { hit } : {}) }].slice(
        -CHAT_MAX,
      );
      // พิมพ์ตรงเป๊ะ → ชนะทันที
      if (hit) return endTurn(ctx, state, ctx.actor, "correct");
      return { state };
    }

    case "guess.correct": {
      if (state.phase !== "guessing" || !state.round) return null;
      if (ctx.actor !== state.round.giver && !isHost(ctx)) throw new GameError("เฉพาะคนใบ้หรือหัวหน้าห้อง");
      const winner = str(p, "playerId", 64);
      if (winner === state.round.giver) throw new GameError("คนใบ้เป็นผู้ชนะเองไม่ได้");
      if (!isActive(ctx, winner)) throw new GameError("ไม่พบผู้เล่นคนนี้");
      return endTurn(ctx, state, winner, "correct");
    }

    case "guess.skip": {
      if (state.phase !== "guessing" || !state.round) return null;
      if (ctx.actor !== state.round.giver && !isHost(ctx)) throw new GameError("เฉพาะคนใบ้หรือหัวหน้าห้อง");
      return endTurn(ctx, state, null, "skip");
    }

    case "guess.timeout": {
      if (state.phase !== "guessing" || !state.round) return null;
      if (ctx.now < state.round.endsAt - 500) return null; // ยังไม่หมดเวลา
      return endTurn(ctx, state, null, "timeout");
    }

    // ---------- ช่วงที่ 3: ส่งไม้ต่อ ----------
    case "guess.next": {
      if (state.phase !== "reveal") return null;
      if (typeof p.expectedTurn === "number" && p.expectedTurn !== state.turnNo) return null;
      const nextTurn = state.turnNo + 1;
      const nextGiver = state.order.length ? state.order[nextTurn % state.order.length] : null;
      if (!isHost(ctx) && ctx.actor !== state.reveal?.giver && ctx.actor !== nextGiver) {
        throw new GameError("รอหัวหน้าห้อง คนใบ้ตาที่แล้ว หรือคนใบ้คนถัดไปกดต่อ");
      }
      state.turnNo = nextTurn;
      state.reveal = null;
      state.chat = [];
      if (state.turnNo >= guessTotalTurns(state)) {
        state.phase = "finished";
        state.finishedAt = ctx.now;
      } else {
        state.phase = "setup";
      }
      return { state };
    }

    // ---------- จบเกม / บทลงโทษ ----------
    case "guess.finish": {
      requireHost(ctx);
      if (state.phase === "finished") return null;
      state.phase = "finished";
      state.finishedAt = ctx.now;
      state.round = null;
      state.chat = [];
      return { state, gameSecret: null, clearPlayerSecrets: true };
    }

    case "guess.recordPenalty": {
      requireHost(ctx);
      if (state.phase !== "finished") throw new GameError("ยังไม่จบเกม");
      if (state.penaltyRecorded) return null;
      for (const id of guessLosers(state)) state.drinks[id] = (state.drinks[id] ?? 0) + 1;
      state.penaltyRecorded = true;
      return { state };
    }

    case "guess.playAgain": {
      requireHost(ctx);
      const order = state.order.filter((id) => isActive(ctx, id));
      if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
      return {
        state: emptyState(order, state.seconds, state.laps, state.giverPoint, state.drinks),
        gameSecret: null,
        clearPlayerSecrets: true,
      };
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** คนที่ได้คะแนนน้อยที่สุด (เสมอกันได้หลายคน) — เฉพาะคนที่ยังอยู่ในคิว */
export function guessLosers(state: Pick<GuessState, "order" | "scores">) {
  if (state.order.length === 0) return [];
  const min = Math.min(...state.order.map((id) => state.scores[id] ?? 0));
  return state.order.filter((id) => (state.scores[id] ?? 0) === min);
}

/** ผู้เล่นที่เข้ามาระหว่างเกม → ต่อท้ายคิวคนใบ้ */
export function guessAddPlayer(state: GuessState, id: string): GuessState {
  if (state.order.includes(id)) return state;
  // ใส่ไว้ท้ายคิวโดยไม่ทำให้คนใบ้ตาปัจจุบันเปลี่ยน
  const len = state.order.length;
  const lap = len ? Math.floor(state.turnNo / len) : 0;
  const pos = len ? state.turnNo % len : 0;
  const order = [...state.order, id];
  return { ...state, order, turnNo: lap * order.length + pos, scores: { ...state.scores, [id]: state.scores[id] ?? 0 } };
}

/** ผู้เล่นออก/ถูกเตะ: เอาออกจากคิว ถ้าเป็นคนใบ้ที่กำลังเล่นอยู่ → ยกเลิกตานั้น (ไม่มีใครได้คะแนน) */
export function guessRemovePlayer(state: GuessState, id: string, now: number): Changes | null {
  const idx = state.order.indexOf(id);
  if (idx === -1) return null;
  const len = state.order.length;
  const lap = Math.floor(state.turnNo / len);
  let pos = state.turnNo % len;
  const wasGiver = idx === pos;
  if (idx < pos) pos -= 1;
  const order = state.order.filter((x) => x !== id);
  const next: GuessState = { ...state, order };
  if (order.length === 0) return { state: { ...next, turnNo: 0 } };
  if (pos >= order.length) {
    // คนสุดท้ายของรอบออกไป → ขึ้นรอบใหม่
    next.turnNo = (lap + 1) * order.length;
  } else {
    next.turnNo = lap * order.length + pos;
  }
  const changes: Changes = { state: next };
  if (wasGiver && (state.phase === "setup" || state.phase === "guessing")) {
    next.round = null;
    next.chat = [];
    changes.gameSecret = null;
    changes.clearPlayerSecrets = true;
    next.phase = "setup";
  }
  if (next.phase !== "finished" && next.turnNo >= guessTotalTurns(next)) {
    next.phase = "finished";
    next.finishedAt = now;
  }
  return changes;
}
