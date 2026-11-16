import { FILL_POOL } from "../fill-words";
import type { FillReveal, FillState, FillTeam } from "../types";
import { type Changes, type Ctx, GameError, type Payload, clone, isActive, isHost, requireHost, shuffle, str } from "./core";
import { normalizeGuess } from "./guess";

const ALLOWED_QUESTIONS = [5, 10, 15];
const ALLOWED_SECONDS = [15, 30, 45, 60];
/** โชว์เฉลยกี่มิลลิวินาทีก่อนไปข้อถัดไปอัตโนมัติ */
export const FILL_REVEAL_MS = 4000;
const GRACE_MS = 400;
const FEED_MAX = 12;
const ANSWER_MAX = 60;
/** สัดส่วนตัวอักษรที่ซ่อน */
const HIDE_RATIO = 0.5;

interface FillSecret {
  words: { word: string; category: string }[];
}

/** แยกคำเป็นตัวอักษรที่มองเห็นได้ (สระ/วรรณยุกต์ไทยติดไปกับพยัญชนะ) */
export function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/** ซ่อนตัวอักษรราวครึ่งหนึ่ง (ไม่นับเว้นวรรค) — อย่างน้อยซ่อน 1 และโชว์ 1 */
export function maskWord(word: string): (string | null)[] {
  const g = graphemes(word);
  const letters = g.map((c, i) => (c.trim() ? i : -1)).filter((i) => i >= 0);
  let hideCount = Math.round(letters.length * HIDE_RATIO);
  hideCount = Math.min(Math.max(hideCount, 1), Math.max(letters.length - 1, 1));
  const hide = new Set(shuffle(letters).slice(0, hideCount));
  return g.map((c, i) => (!c.trim() ? " " : hide.has(i) ? null : c));
}

function getState(ctx: Ctx): FillState {
  if (ctx.state?.kind !== "fill") throw new GameError("ไม่ได้อยู่ในเกมเติมคำ");
  return clone(ctx.state);
}

function getSecret(ctx: Ctx): FillSecret {
  const s = ctx.gameSecret as Partial<FillSecret> | null;
  if (!s || !Array.isArray(s.words) || s.words.length === 0) {
    throw new GameError("ข้อมูลเกมเสียหาย ให้หัวหน้าห้องเริ่มเกมใหม่");
  }
  return s as FillSecret;
}

function pickWords(n: number, avoid: string[] = []) {
  const fresh = shuffle(FILL_POOL.filter((w) => !avoid.includes(w.word)));
  const pool = fresh.length >= n ? fresh : shuffle(FILL_POOL);
  return pool.slice(0, n);
}

function openQuestion(state: FillState, secret: FillSecret, ctx: Ctx) {
  const w = secret.words[state.qNo];
  state.phase = "question";
  state.reveal = null;
  state.feed = [];
  state.question = {
    no: state.qNo,
    tiles: maskWord(w.word),
    category: w.category,
    startsAt: ctx.now,
    endsAt: ctx.now + state.seconds * 1000,
  };
}

function freshState(
  ctx: Ctx,
  mode: FillState["mode"],
  order: string[],
  teams: FillTeam[],
  total: number,
  seconds: number,
  drinks: Record<string, number> = {},
): { state: FillState; secret: FillSecret } {
  const secret: FillSecret = { words: pickWords(total) };
  const state: FillState = {
    kind: "fill",
    mode,
    order,
    teams,
    total: secret.words.length,
    seconds,
    qNo: 0,
    phase: "question",
    question: null,
    reveal: null,
    scores: Object.fromEntries(order.map((id) => [id, 0])),
    teamScores: Object.fromEntries(teams.map((t) => [t.id, 0])),
    feed: [],
    feedSeq: 0,
    history: [],
    drinks,
    penaltyRecorded: false,
    finishedAt: null,
  };
  openQuestion(state, secret, ctx);
  return { state, secret };
}

export function startFill(ctx: Ctx): Changes {
  const s = ctx.setup.fill;
  const total = ALLOWED_QUESTIONS.includes(s.questions) ? s.questions : 10;
  const seconds = ALLOWED_SECONDS.includes(s.seconds) ? s.seconds : 30;
  let order: string[];
  let teams: FillTeam[] = [];
  if (s.mode === "team") {
    teams = s.teams
      .map((t) => ({ ...t, members: t.members.filter((id) => isActive(ctx, id)) }))
      .filter((t) => t.members.length > 0);
    if (teams.length < 2) throw new GameError("ต้องมีอย่างน้อย 2 ทีมที่มีสมาชิก");
    order = teams.flatMap((t) => t.members);
  } else {
    order = s.participants.filter((id) => isActive(ctx, id));
    if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
  }
  const { state, secret } = freshState(ctx, s.mode === "team" ? "team" : "solo", order, teams, total, seconds);
  return {
    room: { stage: "playing", game: "fill" },
    state,
    gameSecret: secret as unknown as Record<string, unknown>,
    clearPlayerSecrets: true,
  };
}

export function fillTeamOf(state: Pick<FillState, "teams">, id: string) {
  return state.teams.find((t) => t.members.includes(id)) ?? null;
}

function closeQuestion(state: FillState, secret: FillSecret, ctx: Ctx, winner: string | null) {
  const w = secret.words[state.qNo];
  const team = winner && state.mode === "team" ? fillTeamOf(state, winner)?.id ?? null : null;
  if (winner) {
    state.scores = { ...state.scores, [winner]: (state.scores[winner] ?? 0) + 1 };
    if (team) state.teamScores = { ...state.teamScores, [team]: (state.teamScores[team] ?? 0) + 1 };
  }
  const reveal: FillReveal = {
    no: state.qNo,
    word: w.word,
    category: w.category,
    winner,
    team,
    at: ctx.now,
    nextAt: ctx.now + FILL_REVEAL_MS,
  };
  state.phase = "reveal";
  state.reveal = reveal;
  state.history = [...state.history, reveal];
}

/** ผู้แพ้: คะแนนน้อยสุด (โหมดทีม = สมาชิกทุกคนของทีมที่คะแนนน้อยสุด) */
export function fillLosers(state: FillState): string[] {
  if (state.mode === "team") {
    // ทีมที่สมาชิกออกหมดแล้วไม่นับ (ไม่งั้นทีมว่าง 0 คะแนนจะ "แพ้" แทนทีมจริง)
    const teams = state.teams.filter((t) => t.members.length > 0);
    if (teams.length === 0) return [];
    const min = Math.min(...teams.map((t) => state.teamScores[t.id] ?? 0));
    return teams.filter((t) => (state.teamScores[t.id] ?? 0) === min).flatMap((t) => t.members);
  }
  if (state.order.length === 0) return [];
  const min = Math.min(...state.order.map((id) => state.scores[id] ?? 0));
  return state.order.filter((id) => (state.scores[id] ?? 0) === min);
}

export function fillAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);
  switch (type) {
    case "fill.answer": {
      const text = str(p, "text", ANSWER_MAX).trim();
      if (!text) throw new GameError("พิมพ์คำตอบก่อนนะ");
      if (typeof p.qNo === "number" && p.qNo !== state.qNo) throw new GameError("ข้อนี้จบไปแล้ว");
      if (state.phase === "reveal") {
        const r = state.reveal;
        throw new GameError(r?.winner ? "ช้าไปนิด! มีคนตอบถูกไปก่อนแล้ว" : "หมดเวลาข้อนี้แล้ว");
      }
      if (state.phase !== "question" || !state.question) throw new GameError("เกมจบแล้ว");
      if (!state.order.includes(ctx.actor)) throw new GameError("คุณไม่ได้อยู่ในเกมนี้");
      if (ctx.now > state.question.endsAt + GRACE_MS) throw new GameError("หมดเวลาข้อนี้แล้ว");
      const secret = getSecret(ctx);
      const answer = secret.words[state.qNo]?.word ?? "";
      if (normalizeGuess(text) === normalizeGuess(answer)) {
        // คนแรกที่ตอบถูก — commit ก่อนชนะ (คนที่ส่งพร้อมกันจะได้ข้อความ "ช้าไปนิด")
        closeQuestion(state, secret, ctx, ctx.actor);
        return { state };
      }
      state.feedSeq += 1;
      state.feed = [...state.feed, { id: state.feedSeq, player: ctx.actor, text, at: ctx.now }].slice(-FEED_MAX);
      return { state };
    }

    case "fill.timeout": {
      if (state.phase !== "question" || !state.question) return null;
      if (ctx.now < state.question.endsAt - GRACE_MS) return null;
      closeQuestion(state, getSecret(ctx), ctx, null);
      return { state };
    }

    case "fill.next": {
      if (state.phase !== "reveal" || !state.reveal) return null;
      if (typeof p.expectedNo === "number" && p.expectedNo !== state.qNo) return null; // มีคนกดไปแล้ว
      if (!isHost(ctx) && ctx.now < state.reveal.nextAt - GRACE_MS) return null;
      const secret = getSecret(ctx);
      if (state.qNo + 1 >= secret.words.length) {
        state.phase = "finished";
        state.question = null;
        state.finishedAt = ctx.now;
        return { state };
      }
      state.qNo += 1;
      openQuestion(state, secret, ctx);
      return { state };
    }

    case "fill.finish": {
      requireHost(ctx);
      if (state.phase === "finished") return null;
      if (state.phase === "question") closeQuestion(state, getSecret(ctx), ctx, null);
      state.phase = "finished";
      state.question = null;
      state.finishedAt = ctx.now;
      return { state };
    }

    case "fill.recordPenalty": {
      requireHost(ctx);
      if (state.phase !== "finished" || state.penaltyRecorded) return null;
      const losers = fillLosers(state);
      if (losers.length === 0) return null;
      const drinks = { ...state.drinks };
      for (const id of losers) drinks[id] = (drinks[id] ?? 0) + 1;
      state.drinks = drinks;
      state.penaltyRecorded = true;
      return { state };
    }

    case "fill.playAgain": {
      requireHost(ctx);
      if (state.phase !== "finished") return null;
      const teams = state.teams
        .map((t) => ({ ...t, members: t.members.filter((id) => isActive(ctx, id)) }))
        .filter((t) => t.members.length > 0);
      const order = state.mode === "team" ? teams.flatMap((t) => t.members) : state.order.filter((id) => isActive(ctx, id));
      if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
      if (state.mode === "team" && teams.length < 2) throw new GameError("ต้องมีอย่างน้อย 2 ทีมที่มีสมาชิก");
      const used = getSecret(ctx).words.map((w) => w.word);
      const { state: next, secret } = freshState(ctx, state.mode, order, teams, state.total, state.seconds, state.drinks);
      // พยายามไม่ใช้คำซ้ำกับเกมที่แล้ว
      secret.words = pickWords(state.total, used);
      next.total = secret.words.length;
      openQuestion(next, secret, ctx);
      return { state: next, gameSecret: secret as unknown as Record<string, unknown> };
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** คนเข้าห้องระหว่างเกม (ช่วงเฉลย/จบเกม) → เข้าร่วมเลย โหมดทีมลงทีมที่คนน้อยสุด */
export function fillAddPlayer(state: FillState, id: string): FillState {
  if (state.order.includes(id)) return state;
  const next: FillState = { ...state, order: [...state.order, id], scores: { ...state.scores, [id]: 0 } };
  if (state.mode === "team" && state.teams.length > 0) {
    const smallest = [...state.teams].sort((a, b) => a.members.length - b.members.length)[0];
    next.teams = state.teams.map((t) => (t.id === smallest.id ? { ...t, members: [...t.members, id] } : t));
  }
  return next;
}

export function fillRemovePlayer(state: FillState, id: string): FillState {
  if (!state.order.includes(id)) return state;
  return {
    ...state,
    order: state.order.filter((x) => x !== id),
    teams: state.teams.map((t) => ({ ...t, members: t.members.filter((x) => x !== id) })),
  };
}
