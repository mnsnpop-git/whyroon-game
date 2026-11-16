import { TEAM_COLORS } from "../constants";
import type { WordResult, WordsSecret, WordsState, WordsUnit } from "../types";
import { WORD_CATEGORIES, wordsFor } from "../words-data";
import {
  type Changes,
  type Ctx,
  GameError,
  type Payload,
  clone,
  isActive,
  isHost,
  requireHost,
  shuffle,
} from "./core";

const COUNTDOWN_MS = 3500;
const GIVER_DECK_SIZE = 250;

interface WordsGameSecret {
  used: string[]; // คำที่ออกไปแล้ว (จะไม่ซ้ำจนกว่าจะใช้ครบคลัง)
  results: WordResult[];
}

function getState(ctx: Ctx): WordsState {
  if (ctx.state?.kind !== "words") throw new GameError("ไม่ได้อยู่ในเกมทายคำ");
  return clone(ctx.state);
}

function getSecret(ctx: Ctx): WordsGameSecret {
  const s = ctx.gameSecret as WordsGameSecret | null;
  if (!s || !Array.isArray(s.used)) throw new GameError("คลังคำศัพท์ผิดพลาด");
  return clone(s);
}

export function startWords(ctx: Ctx): Changes {
  const s = ctx.setup.words;
  let units: WordsUnit[];
  if (s.mode === "team") {
    units = s.teams
      .map((t) => ({
        id: t.id,
        name: t.name.trim() || "ทีมไม่มีชื่อ",
        color: t.color,
        members: t.members.filter((id) => isActive(ctx, id)),
        score: 0,
        nextMember: 0,
      }))
      .filter((u) => u.members.length > 0);
    if (units.length < 2) throw new GameError("ต้องมีอย่างน้อย 2 ทีมที่มีสมาชิก");
  } else {
    const order = s.soloOrder.filter((id) => isActive(ctx, id));
    if (order.length < 2) throw new GameError("ต้องมีผู้เล่นอย่างน้อย 2 คน");
    units = order.map((id, i) => {
      const p = ctx.players.find((x) => x.id === id)!;
      return {
        id,
        name: `${p.emoji} ${p.nickname}`,
        color: TEAM_COLORS[i % TEAM_COLORS.length].hex,
        members: [id],
        score: 0,
        nextMember: 0,
      };
    });
  }

  const state: WordsState = {
    kind: "words",
    mode: s.mode,
    category: s.category,
    scope: s.scope === "th" ? "th" : "global",
    seconds: s.seconds,
    units,
    unitTurn: 0,
    phase: "ready",
    round: null,
    lastRound: null,
    roundNo: 0,
    history: [],
    finishedAt: null,
  };
  const secret: WordsGameSecret = { used: [], results: [] };
  return {
    room: { stage: "playing", game: "words" },
    state,
    gameSecret: secret,
    clearPlayerSecrets: true,
  };
}

/** สร้างกองคำให้คนใบ้: คำที่ยังไม่เคยออกมาก่อน แล้วต่อท้ายด้วยคำสุ่มใหม่จนครบ n คำ */
function buildGiverDeck(used: string[], state: WordsState, n: number) {
  const all = wordsFor(state.category, state.scope ?? "global");
  const usedSet = new Set(used);
  const out = shuffle(all.filter((w) => !usedSet.has(w)));
  while (out.length < n) out.push(...shuffle(all));
  return out.slice(0, n);
}

function currentGiver(unit: WordsUnit) {
  return unit.members[unit.nextMember % unit.members.length];
}

export function wordsNextGiver(state: WordsState): string | null {
  const unit = state.units[state.unitTurn];
  return unit ? currentGiver(unit) : null;
}

export function wordsAction(ctx: Ctx, type: string, p: Payload): Changes | null {
  const state = getState(ctx);

  switch (type) {
    case "words.startRound": {
      if (state.phase === "playing") return null;
      if (state.finishedAt) throw new GameError("เกมจบแล้ว กดเล่นต่อก่อน");
      const unit = state.units[state.unitTurn];
      if (!unit) throw new GameError("ไม่มีทีมที่จะเล่น");
      const giver = currentGiver(unit);
      if (ctx.actor !== giver && !isHost(ctx)) {
        throw new GameError("เฉพาะคนใบ้หรือหัวหน้าห้องที่กดเริ่มได้");
      }
      const secret = getSecret(ctx);
      const giverDeck = buildGiverDeck(secret.used, state, GIVER_DECK_SIZE);
      const startsAt = ctx.now + COUNTDOWN_MS;
      state.phase = "playing";
      state.round = {
        unitId: unit.id,
        giver,
        startsAt,
        endsAt: startsAt + state.seconds * 1000,
        count: 0,
        correct: 0,
        pausedAt: null,
      };
      const giverSecret: WordsSecret = { kind: "words", deck: giverDeck };
      return {
        state,
        gameSecret: { ...secret, results: [] },
        clearPlayerSecrets: true,
        playerSecrets: { [giver]: giverSecret },
      };
    }

    case "words.mark": {
      if (state.phase !== "playing" || !state.round) return null;
      const round = state.round;
      if (ctx.actor !== round.giver) throw new GameError("เฉพาะคนใบ้เท่านั้น");
      const index = p.index;
      const result = p.result;
      if (typeof index !== "number" || (result !== "correct" && result !== "pass")) {
        throw new GameError("ข้อมูลไม่ถูกต้อง");
      }
      if (index < round.count) return null; // ส่งซ้ำ
      if (index > round.count) throw new GameError("ลำดับคำไม่ตรงกัน");
      // กดก่อนหยุดเกมแต่ส่งมาถึงช้านิดหน่อย ยังนับให้
      if (round.pausedAt && ctx.now > round.pausedAt + 1500) throw new GameError("เกมหยุดอยู่");
      const at = round.pausedAt ? Math.min(ctx.now, round.pausedAt) : ctx.now;
      if (at < round.startsAt - 800) throw new GameError("ยังไม่เริ่มจับเวลา");
      if (at > round.endsAt + 2000) throw new GameError("หมดเวลาแล้ว!");
      const giverSecret = ctx.playerSecrets[round.giver] as unknown as WordsSecret | undefined;
      const word = giverSecret?.deck?.[index];
      if (!word) throw new GameError("คำศัพท์หมดแล้ว");
      const secret = getSecret(ctx);
      secret.results.push({ text: word, result });
      round.count += 1;
      if (result === "correct") round.correct += 1;
      return { state, gameSecret: secret };
    }

    case "words.endRound": {
      if (state.phase !== "playing" || !state.round) return null;
      const round = state.round;
      const early = !!round.pausedAt || ctx.now < round.endsAt - 500;
      if (early && ctx.actor !== round.giver && !isHost(ctx)) return null;
      const secret = getSecret(ctx);
      const unitIdx = state.units.findIndex((u) => u.id === round.unitId);
      if (unitIdx >= 0) {
        state.units[unitIdx].score += round.correct;
        state.units[unitIdx].nextMember += 1;
      }
      // จำคำที่ออกไปแล้ว (รวมคำที่ค้างบนจอตอนหมดเวลา) เพื่อไม่ให้ซ้ำรอบหน้า
      const giverSecret = ctx.playerSecrets[round.giver] as unknown as WordsSecret | undefined;
      const shown = giverSecret?.deck?.slice(0, round.count + 1) ?? [];
      let used = Array.from(new Set([...secret.used, ...shown]));
      if (used.length >= wordsFor(state.category, state.scope ?? "global").length) used = [];
      state.lastRound = { ...round, pausedAt: null, words: secret.results };
      state.history = [
        ...(state.history ?? []),
        { unitId: round.unitId, giver: round.giver, correct: round.correct, count: round.count },
      ];
      state.round = null;
      state.phase = "summary";
      state.roundNo += 1;
      state.unitTurn = (state.unitTurn + 1) % state.units.length;
      return {
        state,
        gameSecret: { used, results: [] } satisfies WordsGameSecret,
        clearPlayerSecrets: true,
      };
    }

    case "words.pause": {
      if (state.phase !== "playing" || !state.round) return null;
      const round = state.round;
      if (round.pausedAt) return null;
      if (ctx.actor !== round.giver && !isHost(ctx)) {
        throw new GameError("เฉพาะคนใบ้หรือหัวหน้าห้องที่หยุดเกมได้");
      }
      if (ctx.now >= round.endsAt) return null; // หมดเวลาไปแล้ว
      round.pausedAt = ctx.now;
      return { state };
    }

    case "words.resume": {
      if (state.phase !== "playing" || !state.round) return null;
      const round = state.round;
      if (!round.pausedAt) return null;
      if (ctx.actor !== round.giver && !isHost(ctx)) {
        throw new GameError("เฉพาะคนใบ้หรือหัวหน้าห้องที่เล่นต่อได้");
      }
      // เลื่อนเวลาเริ่ม/จบออกไปเท่ากับช่วงที่หยุด
      const shift = Math.max(0, ctx.now - round.pausedAt);
      round.startsAt += shift;
      round.endsAt += shift;
      round.pausedAt = null;
      return { state };
    }

    case "words.setCategory": {
      requireHost(ctx);
      if (state.phase === "playing") throw new GameError("รอให้จบรอบนี้ก่อนค่อยเปลี่ยนหมวด");
      // ส่งมาเฉพาะที่จะเปลี่ยน: category และ/หรือ scope
      let category = state.category;
      if (p.category !== undefined) {
        const found = WORD_CATEGORIES.find((c) => c.id === p.category);
        if (!found) throw new GameError("ไม่พบหมวดนี้");
        category = found.id;
      }
      let scope = state.scope ?? "global";
      if (p.scope !== undefined) {
        if (p.scope !== "th" && p.scope !== "global") throw new GameError("ข้อมูลไม่ถูกต้อง");
        scope = p.scope;
      }
      if (category === state.category && scope === (state.scope ?? "global")) return null;
      state.category = category;
      state.scope = scope;
      // จำหมวดล่าสุดไว้ในหน้าตั้งค่าด้วย
      return { state, setup: { ...ctx.setup, words: { ...ctx.setup.words, category, scope } } };
    }

    case "words.finish": {
      requireHost(ctx);
      if (state.phase === "playing") throw new GameError("รอให้จบรอบนี้ก่อนค่อยจบเกม");
      if (state.finishedAt) return null;
      state.finishedAt = ctx.now;
      return { state };
    }

    case "words.resumeGame": {
      requireHost(ctx);
      if (!state.finishedAt) return null;
      state.finishedAt = null;
      return { state };
    }

    case "words.restart": {
      requireHost(ctx);
      if (state.phase === "playing") throw new GameError("รอให้จบรอบนี้ก่อน");
      state.units = state.units.map((u) => ({ ...u, score: 0, nextMember: 0 }));
      state.unitTurn = 0;
      state.phase = "ready";
      state.round = null;
      state.lastRound = null;
      state.roundNo = 0;
      state.history = [];
      state.finishedAt = null;
      return { state };
    }

    case "words.adjustScore": {
      requireHost(ctx);
      const unitId = p.unitId;
      const delta = p.delta;
      if (typeof delta !== "number" || Math.abs(delta) > 10) throw new GameError("ข้อมูลไม่ถูกต้อง");
      const unit = state.units.find((u) => u.id === unitId);
      if (!unit) throw new GameError("ไม่พบทีม");
      unit.score = Math.max(0, unit.score + delta);
      return { state };
    }

    case "words.regroup": {
      requireHost(ctx);
      return {
        room: { stage: "setup", game: "words" },
        state: null,
        gameSecret: null,
        clearPlayerSecrets: true,
      };
    }
  }
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

/** ผู้เล่นที่เข้ามาระหว่างเกม (ระหว่างรอบ) → เล่นเดี่ยว: เพิ่มเป็นผู้เล่นใหม่ / แบ่งทีม: เข้าทีมที่คนน้อยที่สุด */
export function wordsAddPlayer(state: WordsState, player: { id: string; nickname: string; emoji: string }) {
  if (state.units.some((u) => u.members.includes(player.id))) return state;
  const units = state.units.map((u) => ({ ...u, members: [...u.members] }));
  if (state.mode === "solo") {
    units.push({
      id: player.id,
      name: `${player.emoji} ${player.nickname}`,
      color: TEAM_COLORS[units.length % TEAM_COLORS.length].hex,
      members: [player.id],
      score: 0,
      nextMember: 0,
    });
  } else if (units.length > 0) {
    const smallest = units.reduce((a, b) => (b.members.length < a.members.length ? b : a));
    smallest.members.push(player.id);
  }
  return { ...state, units };
}

export function wordsRemovePlayer(state: WordsState, id: string): WordsState {
  return {
    ...state,
    units: state.units.map((u) => {
      if (!u.members.includes(id) || u.members.length <= 1) return u;
      const members = u.members.filter((m) => m !== id);
      return { ...u, members };
    }),
  };
}
