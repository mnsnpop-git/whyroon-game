import { DEFAULT_TEAM_NAMES, EMOJIS, TEAM_COLORS } from "../constants";
export { fullSetup } from "../constants";
import type {
  ChallengeSetup,
  FillSetup,
  GameId,
  GuessSetup,
  GameSetup,
  OhanaSetup,
  Player,
  SpySetup,
  WerewolfSetup,
  WordCategory,
  WordsSetup,
  WordsTeam,
} from "../types";
import { WORD_CATEGORIES } from "../words-data";
import {
  type Changes,
  type Ctx,
  GameError,
  type Payload,
  WaitError,
  activePlayers,
  clone,
  isActive,
  requireHost,
  requireMember,
  shuffle,
  str,
} from "./core";
import { challengeAction, challengeAddPlayer, challengeRemovePlayer, startChallenge } from "./challenge";
import { fillAction, fillAddPlayer, fillRemovePlayer, startFill } from "./fill";
import { guessAction, guessAddPlayer, guessRemovePlayer, startGuess } from "./guess";
import { clampSpies, spyAction, spyAddPlayer, spyRemovePlayer, startSpy } from "./spy";
import { ohanaAction, ohanaAddPlayer, ohanaRemovePlayer, startOhana } from "./ohana";
import { startWerewolf, werewolfAction, werewolfRemovePlayer } from "./werewolf";
import { startWords, wordsAction, wordsAddPlayer, wordsRemovePlayer } from "./words";

export { GameError, WaitError } from "./core";
export type { Changes, Ctx } from "./core";

const MAX_PLAYERS = 30;
const GAME_IDS: GameId[] = ["ohana", "words", "werewolf", "challenge", "guess", "spy", "fill"];
/** เกมที่ใช้ระบบจัดทีม (setup.pickTeam / moveMember / autoTeams) */
type TeamGame = "words" | "fill";
const isTeamGame = (g: GameId | null): g is TeamGame => g === "words" || g === "fill";

export function cleanNickname(raw: unknown) {
  if (typeof raw !== "string") throw new GameError("กรุณาตั้งชื่อเล่น");
  const name = raw.replace(/\s+/g, " ").trim().slice(0, 20);
  if (!name) throw new GameError("กรุณาตั้งชื่อเล่น");
  return name;
}

export function cleanEmoji(raw: unknown) {
  if (typeof raw !== "string" || !EMOJIS.includes(raw)) return EMOJIS[0];
  return raw;
}

/** รูปโปรไฟล์: data URL ของรูป jpeg/png/webp ขนาดไม่เกิน ~20KB (ย่อจากฝั่ง client แล้ว) */
export const AVATAR_MAX_CHARS = 20_000;
export function cleanAvatar(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  if (raw.length > AVATAR_MAX_CHARS) throw new GameError("รูปใหญ่เกินไป ลองเลือกรูปอื่นนะ");
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(raw)) throw new GameError("ไฟล์รูปไม่ถูกต้อง");
  return raw;
}

// ---------- sanitize setup จาก client ----------
function idList(ctx: Ctx, v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const ids = new Set(ctx.players.map((p) => p.id));
  return Array.from(new Set(v.filter((x): x is string => typeof x === "string" && ids.has(x))));
}

function sanitizeOhana(ctx: Ctx, raw: Record<string, unknown>): OhanaSetup {
  const kRaw = Array.isArray(raw.kRules) ? raw.kRules : [];
  const kRules = [0, 1, 2, 3].map((i) =>
    typeof kRaw[i] === "string" ? (kRaw[i] as string).slice(0, 140) : "",
  ) as OhanaSetup["kRules"];
  return {
    participants: idList(ctx, raw.participants),
    kRules,
    decks: raw.decks === 2 ? 2 : 1,
  };
}

function sanitizeWords(ctx: Ctx, raw: Record<string, unknown>): WordsSetup {
  const mode = raw.mode === "solo" ? "solo" : "team";
  const category = WORD_CATEGORIES.some((c) => c.id === raw.category)
    ? (raw.category as WordCategory)
    : "all";
  const scope = raw.scope === "th" ? "th" : "global";
  const seconds = [60, 180, 300, 600].includes(raw.seconds as number)
    ? (raw.seconds as WordsSetup["seconds"])
    : 60;
  const seen = new Set<string>();
  const teamsRaw = Array.isArray(raw.teams) ? raw.teams.slice(0, 4) : [];
  const colors = TEAM_COLORS.map((c) => c.hex);
  const teams: WordsTeam[] = teamsRaw.map((t, i) => {
    const o = (t ?? {}) as Record<string, unknown>;
    const members = idList(ctx, o.members).filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return {
      id: typeof o.id === "string" && o.id ? o.id.slice(0, 24) : `t${i + 1}`,
      name: typeof o.name === "string" ? o.name.slice(0, 24) : DEFAULT_TEAM_NAMES[i],
      color: typeof o.color === "string" && colors.includes(o.color) ? o.color : colors[i],
      members,
    };
  });
  return { mode, category, scope, seconds, teams, soloOrder: idList(ctx, raw.soloOrder) };
}

function sanitizeChallenge(ctx: Ctx, raw: Record<string, unknown>): ChallengeSetup {
  return { participants: idList(ctx, raw.participants), timers: raw.timers !== false };
}

function sanitizeGuess(ctx: Ctx, raw: Record<string, unknown>): GuessSetup {
  const seconds = [30, 60, 90, 120].includes(raw.seconds as number) ? (raw.seconds as GuessSetup["seconds"]) : 60;
  const laps = [1, 2, 3].includes(raw.laps as number) ? (raw.laps as GuessSetup["laps"]) : 1;
  return { participants: idList(ctx, raw.participants), seconds, laps, giverPoint: raw.giverPoint !== false };
}

function sanitizeSpy(ctx: Ctx, raw: Record<string, unknown>): SpySetup {
  const participants = idList(ctx, raw.participants);
  const minutes = [3, 5, 8, 10].includes(raw.minutes as number) ? (raw.minutes as SpySetup["minutes"]) : 5;
  const n = Math.max(participants.length, activePlayers(ctx).length);
  return { participants, minutes, spies: clampSpies(typeof raw.spies === "number" ? raw.spies : 1, n) };
}

function sanitizeFill(ctx: Ctx, raw: Record<string, unknown>): FillSetup {
  const questions = [5, 10, 15].includes(raw.questions as number) ? (raw.questions as FillSetup["questions"]) : 10;
  const seconds = [15, 30, 45, 60].includes(raw.seconds as number) ? (raw.seconds as FillSetup["seconds"]) : 30;
  // ใช้ตัวทำความสะอาดทีมเดียวกับเกมใบ้คำ
  const teams = sanitizeWords(ctx, { teams: raw.teams }).teams;
  return {
    participants: idList(ctx, raw.participants),
    mode: raw.mode === "team" ? "team" : "solo",
    teams,
    questions,
    seconds,
  };
}

function sanitizeWerewolf(raw: Record<string, unknown>): WerewolfSetup {
  const r = (raw.roles ?? {}) as Record<string, unknown>;
  const n = (v: unknown, min: number, max: number, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
  return {
    roles: {
      werewolf: n(r.werewolf, 1, 6, 1),
      seer: n(r.seer, 0, 1, 1),
      doctor: n(r.doctor, 0, 1, 1),
      hunter: n(r.hunter, 0, 1, 0),
    },
    nightSeconds: n(raw.nightSeconds, 15, 120, 30),
    discussSeconds: n(raw.discussSeconds, 30, 900, 180),
    voteSeconds: n(raw.voteSeconds, 15, 300, 60),
  };
}

function defaultTeams(): WordsTeam[] {
  return [0, 1].map((i) => ({
    id: `t${i + 1}`,
    name: DEFAULT_TEAM_NAMES[i],
    color: TEAM_COLORS[i].hex,
    members: [],
  }));
}

/** เตรียม setup เมื่อเข้าเลือกเกม: เติมรายชื่อผู้เล่นปัจจุบัน */
function prepareSetup(ctx: Ctx, game: GameId): GameSetup {
  const setup = clone(ctx.setup);
  const active = activePlayers(ctx).map((p) => p.id);
  const keep = (list: string[]) => {
    const kept = list.filter((id) => active.includes(id));
    return [...kept, ...active.filter((id) => !kept.includes(id))];
  };
  if (game === "ohana") setup.ohana.participants = keep(setup.ohana.participants);
  if (game === "challenge") setup.challenge.participants = keep(setup.challenge.participants);
  if (game === "guess") setup.guess.participants = keep(setup.guess.participants);
  if (game === "spy") {
    setup.spy.participants = keep(setup.spy.participants);
    setup.spy.spies = clampSpies(setup.spy.spies, setup.spy.participants.length);
  }
  if (game === "fill") {
    setup.fill.participants = keep(setup.fill.participants);
    if (setup.fill.teams.length < 2) setup.fill.teams = defaultTeams();
    setup.fill.teams = setup.fill.teams.map((t) => ({
      ...t,
      members: t.members.filter((id) => active.includes(id)),
    }));
  }
  if (game === "words") {
    setup.words.soloOrder = keep(setup.words.soloOrder);
    if (setup.words.teams.length < 2) setup.words.teams = defaultTeams();
    setup.words.teams = setup.words.teams.map((t) => ({
      ...t,
      members: t.members.filter((id) => active.includes(id)),
    }));
  }
  return setup;
}

/** เอาผู้เล่นออกจาก setup/state ของเกมที่กำลังเล่น */
function removeFromGame(ctx: Ctx, id: string): Changes {
  const changes: Changes = {};
  const setup = clone(ctx.setup);
  setup.ohana.participants = setup.ohana.participants.filter((x) => x !== id);
  setup.challenge.participants = setup.challenge.participants.filter((x) => x !== id);
  setup.guess.participants = setup.guess.participants.filter((x) => x !== id);
  setup.spy.participants = setup.spy.participants.filter((x) => x !== id);
  setup.fill.participants = setup.fill.participants.filter((x) => x !== id);
  setup.fill.teams = setup.fill.teams.map((t) => ({ ...t, members: t.members.filter((x) => x !== id) }));
  setup.words.soloOrder = setup.words.soloOrder.filter((x) => x !== id);
  setup.words.teams = setup.words.teams.map((t) => ({
    ...t,
    members: t.members.filter((x) => x !== id),
  }));
  changes.setup = setup;

  if (ctx.room.stage === "playing" && ctx.state) {
    if (ctx.state.kind === "ohana") changes.state = ohanaRemovePlayer(ctx.state, id);
    if (ctx.state.kind === "words") changes.state = wordsRemovePlayer(ctx.state, id);
    if (ctx.state.kind === "challenge") changes.state = challengeRemovePlayer(ctx.state, id);
    if (ctx.state.kind === "fill") changes.state = fillRemovePlayer(ctx.state, id);
    if (ctx.state.kind === "spy") {
      const sp = spyRemovePlayer(ctx, id);
      if (sp) Object.assign(changes, sp);
    }
    if (ctx.state.kind === "guess") {
      const g = guessRemovePlayer(ctx.state, id, ctx.now);
      if (g) Object.assign(changes, g);
    }
    if (ctx.state.kind === "werewolf") {
      const ww = werewolfRemovePlayer(ctx, id);
      if (ww) Object.assign(changes, ww);
    }
  }
  return changes;
}

function updatePlayer(ctx: Ctx, id: string, patch: Partial<Player>): Player {
  const p = ctx.players.find((x) => x.id === id);
  if (!p) throw new GameError("ไม่พบผู้เล่น");
  return { ...p, ...patch };
}

function nextHost(ctx: Ctx, excluding: string) {
  return activePlayers(ctx).find((p) => p.id !== excluding)?.id ?? null;
}

// ---------- main reducer ----------
export function reduce(ctx: Ctx, type: string, p: Payload): Changes | null {
  if (type === "room.join") return join(ctx, p);
  requireMember(ctx);

  switch (type) {
    case "room.leave": {
      const me = updatePlayer(ctx, ctx.actor, { status: "left" });
      const ctx2 = { ...ctx, players: ctx.players.map((x) => (x.id === me.id ? me : x)) };
      const changes = removeFromGame(ctx2, ctx.actor);
      changes.players = [me];
      if (ctx.room.host_id === ctx.actor) {
        const h = nextHost(ctx2, ctx.actor);
        if (h) changes.room = { host_id: h };
      }
      return changes;
    }

    case "room.kick": {
      requireHost(ctx);
      const target = str(p, "playerId", 64);
      if (target === ctx.actor) throw new GameError("เตะตัวเองไม่ได้นะ 😅");
      const kicked = updatePlayer(ctx, target, { status: "kicked" });
      const ctx2 = { ...ctx, players: ctx.players.map((x) => (x.id === target ? kicked : x)) };
      const changes = removeFromGame(ctx2, target);
      changes.players = [kicked];
      return changes;
    }

    case "room.transferHost": {
      requireHost(ctx);
      const target = str(p, "playerId", 64);
      if (!isActive(ctx, target)) throw new GameError("ผู้เล่นคนนี้ไม่อยู่ในห้องแล้ว");
      return { room: { host_id: target } };
    }

    case "room.claimHost": {
      // ใช้เมื่อหัวหน้าห้องหลุด (client ตรวจจาก Presence ว่าออฟไลน์นาน)
      if (ctx.room.host_id === ctx.actor) return null;
      return { room: { host_id: ctx.actor } };
    }

    case "room.updateProfile": {
      const me = updatePlayer(ctx, ctx.actor, {
        nickname: cleanNickname(p.nickname),
        emoji: cleanEmoji(p.emoji),
        // ไม่ส่ง avatar = คงรูปเดิม · null = ลบรูป (กลับไปใช้ emoji)
        ...("avatar" in p ? { avatar: cleanAvatar(p.avatar) } : {}),
      });
      const before = ctx.players.find((x) => x.id === ctx.actor);
      if (
        before &&
        before.nickname === me.nickname &&
        before.emoji === me.emoji &&
        (before.avatar ?? null) === (me.avatar ?? null)
      ) {
        return null;
      }
      return { players: [me] };
    }

    case "hub.selectGame": {
      requireHost(ctx);
      const game = p.game as GameId;
      if (!GAME_IDS.includes(game)) throw new GameError("ไม่รู้จักเกมนี้");
      return {
        room: { stage: "setup", game },
        setup: prepareSetup(ctx, game),
        state: null,
        gameSecret: null,
        clearPlayerSecrets: true,
      };
    }

    case "hub.backToLobby": {
      requireHost(ctx);
      return {
        room: { stage: "lobby", game: null },
        state: null,
        gameSecret: null,
        clearPlayerSecrets: true,
      };
    }

    case "setup.update": {
      requireHost(ctx);
      const game = p.game as GameId;
      const raw = (p.setup ?? {}) as Record<string, unknown>;
      const setup = clone(ctx.setup);
      if (game === "ohana") setup.ohana = sanitizeOhana(ctx, raw);
      else if (game === "words") {
        const next = sanitizeWords(ctx, raw);
        // สมาชิกทีมเปลี่ยนผ่าน setup.pickTeam / setup.moveMember เท่านั้น กันข้อมูลทับกัน
        const old = new Map(setup.words.teams.map((t) => [t.id, t.members]));
        next.teams = next.teams.map((t) => ({ ...t, members: old.get(t.id) ?? [] }));
        setup.words = next;
      }
      else if (game === "werewolf") setup.werewolf = sanitizeWerewolf(raw);
      else if (game === "challenge") setup.challenge = sanitizeChallenge(ctx, raw);
      else if (game === "guess") setup.guess = sanitizeGuess(ctx, raw);
      else if (game === "spy") setup.spy = sanitizeSpy(ctx, raw);
      else if (game === "fill") {
        const next = sanitizeFill(ctx, raw);
        const old = new Map(setup.fill.teams.map((t) => [t.id, t.members]));
        next.teams = next.teams.map((t) => ({ ...t, members: old.get(t.id) ?? [] }));
        setup.fill = next;
      }
      else throw new GameError("ไม่รู้จักเกมนี้");
      return { setup };
    }

    case "setup.pickTeam": {
      const game = ctx.room.game;
      if (ctx.room.stage !== "setup" || !isTeamGame(game)) {
        throw new GameError("ตอนนี้ยังเลือกทีมไม่ได้");
      }
      const teamId = str(p, "teamId", 24);
      const setup = clone(ctx.setup);
      if (!setup[game].teams.some((t) => t.id === teamId)) throw new GameError("ไม่พบทีมนี้");
      setup[game].teams = setup[game].teams.map((t) => {
        const members = t.members.filter((id) => id !== ctx.actor);
        if (t.id === teamId) members.push(ctx.actor);
        return { ...t, members };
      });
      return { setup };
    }

    case "setup.moveMember": {
      requireHost(ctx);
      const playerId = str(p, "playerId", 64);
      const teamId = typeof p.teamId === "string" ? p.teamId : null;
      if (!isActive(ctx, playerId)) throw new GameError("ผู้เล่นคนนี้ไม่อยู่ในห้องแล้ว");
      const game: TeamGame = ctx.room.game === "fill" ? "fill" : "words";
      const setup = clone(ctx.setup);
      const index = typeof p.index === "number" ? p.index : -1;
      setup[game].teams = setup[game].teams.map((t) => {
        const members = t.members.filter((id) => id !== playerId);
        if (t.id === teamId) {
          if (index >= 0 && index <= members.length) members.splice(index, 0, playerId);
          else members.push(playerId);
        }
        return { ...t, members };
      });
      return { setup };
    }

    case "setup.autoTeams": {
      requireHost(ctx);
      const game: TeamGame = ctx.room.game === "fill" ? "fill" : "words";
      const setup = clone(ctx.setup);
      const teams = setup[game].teams.length >= 2 ? setup[game].teams : defaultTeams();
      const ids = shuffle(activePlayers(ctx).map((x) => x.id));
      const buckets: string[][] = teams.map(() => []);
      ids.forEach((id, i) => buckets[i % teams.length].push(id));
      setup[game].teams = teams.map((t, i) => ({ ...t, members: buckets[i] }));
      return { setup };
    }

    case "game.start": {
      requireHost(ctx);
      if (ctx.room.stage !== "setup" || !ctx.room.game) throw new GameError("ยังไม่ได้เลือกเกม");
      if (ctx.room.game === "ohana") return startOhana(ctx);
      if (ctx.room.game === "words") return startWords(ctx);
      if (ctx.room.game === "challenge") return startChallenge(ctx);
      if (ctx.room.game === "guess") return startGuess(ctx);
      if (ctx.room.game === "spy") return startSpy(ctx);
      if (ctx.room.game === "fill") return startFill(ctx);
      return startWerewolf(ctx);
    }

    case "game.end": {
      requireHost(ctx);
      return {
        room: { stage: "setup" },
        state: null,
        gameSecret: null,
        clearPlayerSecrets: true,
      };
    }
  }

  if (ctx.room.stage !== "playing") throw new GameError("เกมยังไม่เริ่ม");
  if (type.startsWith("ohana.")) return ohanaAction(ctx, type, p);
  if (type.startsWith("words.")) return wordsAction(ctx, type, p);
  if (type.startsWith("ww.")) return werewolfAction(ctx, type, p);
  if (type.startsWith("challenge.")) return challengeAction(ctx, type, p);
  if (type.startsWith("guess.")) return guessAction(ctx, type, p);
  if (type.startsWith("spy.")) return spyAction(ctx, type, p);
  if (type.startsWith("fill.")) return fillAction(ctx, type, p);
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

function join(ctx: Ctx, p: Payload): Changes | null {
  const nickname = cleanNickname(p.nickname);
  const emoji = cleanEmoji(p.emoji);
  // รูปเสียหาย/ใหญ่เกิน ไม่ควรทำให้เข้าห้องไม่ได้ → ใช้ emoji แทน
  let avatar: string | null = null;
  try {
    avatar = cleanAvatar(p.avatar);
  } catch {
    avatar = null;
  }
  const existing = ctx.players.find((x) => x.id === ctx.actor);
  if (existing?.status === "active") {
    // อยู่ในห้องอยู่แล้ว (เช่น รีเฟรชหน้า) → เข้าได้ทันที
    if (existing.nickname === nickname && existing.emoji === emoji && (existing.avatar ?? null) === avatar) return null;
    return { players: [{ ...existing, nickname, emoji, avatar }] };
  }

  // คนใหม่ / คนที่ออกไปแล้วกลับมา: ถ้ากำลังเล่นกลางตา ต้องรอจบตาก่อน
  const gate = joinGate(ctx, typeof p.waitKey === "string" ? p.waitKey : null);
  if (gate) throw new WaitError(gate.reason, gate.key);

  if (existing) {
    const back: Player = { ...existing, nickname, emoji, avatar, status: "active" };
    const changes: Changes = { players: [back] };
    addToSetup(ctx, changes);
    addToGame(ctx, back, changes);
    return changes;
  }
  if (activePlayers(ctx).length >= MAX_PLAYERS) throw new GameError("ห้องเต็มแล้ว (สูงสุด 30 คน)");
  const player: Player = {
    id: ctx.actor,
    nickname,
    emoji,
    avatar,
    status: "active",
    joined_at: new Date(ctx.now).toISOString(),
  };
  const changes: Changes = { players: [player] };
  addToSetup(ctx, changes);
  addToGame(ctx, player, changes);
  if (activePlayers(ctx).length === 0) changes.room = { host_id: ctx.actor };
  return changes;
}

/**
 * ตรวจว่าตอนนี้ให้คนเข้าห้องได้ไหม (null = เข้าได้)
 * - ใบ้คำ: รอให้รอบที่กำลังใบ้อยู่จบก่อน
 * - Werewolf: รอให้เกมจบก่อน (บทบาทแจกไปแล้ว)
 * - Doraemon: รอให้ตาปัจจุบันจบ คือมีคนจั่วไพ่ใบถัดไป (waitKey = ตาที่เห็นตอนเริ่มรอ)
 */
function joinGate(ctx: Ctx, waitKey: string | null): { reason: string; key: string } | null {
  const s = ctx.state;
  if (ctx.room.stage !== "playing" || !s) return null;
  if (s.kind === "words") {
    if (s.finishedAt || s.phase !== "playing") return null;
    return { reason: "กำลังใบ้คำกันอยู่ รอให้รอบนี้จบก่อนนะ", key: `w${s.roundNo}` };
  }
  if (s.kind === "werewolf") {
    if (s.phase === "ended") return null;
    return { reason: "เกม Werewolf กำลังเล่นอยู่ รอให้เกมนี้จบก่อนนะ", key: "ww" };
  }
  if (s.kind === "guess") {
    // ตา = ช่วงที่กำลังจับเวลาทายคำ → เข้าได้ตอนตั้งคำ/เฉลย/จบเกม
    if (s.phase !== "guessing") return null;
    return { reason: "กำลังทายคำกันอยู่ รอให้ตานี้จบก่อนนะ", key: `g${s.turnNo}` };
  }
  if (s.kind === "spy") {
    // บทบาทแจกไปแล้ว → เข้าได้ตอนจบรอบ แล้วได้เล่นรอบถัดไป
    if (s.phase === "ended") return null;
    return { reason: "กำลังหาตัวสายลับกันอยู่ รอให้รอบนี้จบก่อนนะ", key: `s${s.round}` };
  }
  if (s.kind === "fill") {
    // ตา = ข้อที่กำลังจับเวลา → เข้าได้ตอนเฉลย/จบเกม
    if (s.phase !== "question") return null;
    return { reason: "กำลังแข่งเติมคำข้อนี้อยู่ รอให้ข้อนี้จบก่อนนะ", key: `f${s.qNo}` };
  }
  if (s.kind === "challenge") {
    // ตา = การ์ดใบปัจจุบัน → เข้าได้เมื่อมีคนจั่วการ์ดใบใหม่ (หรือเกมจบ)
    if (s.finishedAt) return null;
    const key = `c${s.drawn}`;
    if (waitKey && waitKey !== key) return null;
    return { reason: "กำลังเล่นการ์ดใบนี้อยู่ รอให้มีคนจั่วการ์ดใบใหม่ก่อนนะ", key };
  }
  if (s.finishedAt || s.remaining === 0) return null;
  const key = `o${s.total}-${s.remaining}`;
  if (waitKey && waitKey !== key) return null;
  return { reason: "กำลังเล่นตานี้อยู่ รอให้มีคนจั่วไพ่ใบถัดไปก่อนนะ", key };
}

/** ผู้เล่นที่เข้ามาระหว่างเกม (หลังจบตา) → ใส่เข้าเกมที่กำลังเล่นเลย */
function addToGame(ctx: Ctx, player: Player, changes: Changes) {
  const s = ctx.state;
  if (ctx.room.stage !== "playing" || !s) return;
  if (s.kind === "ohana") changes.state = ohanaAddPlayer(s, player.id);
  else if (s.kind === "words") changes.state = wordsAddPlayer(s, player);
  else if (s.kind === "challenge") changes.state = challengeAddPlayer(s, player.id);
  else if (s.kind === "guess" && s.phase !== "finished") changes.state = guessAddPlayer(s, player.id);
  else if (s.kind === "spy") changes.state = spyAddPlayer(s, player.id);
  else if (s.kind === "fill" && s.phase !== "finished") changes.state = fillAddPlayer(s, player.id);
  // Werewolf: เข้าได้หลังเกมจบเท่านั้น → จะได้เล่นตอนเริ่มเกมใหม่
}

/** ผู้เล่นใหม่ที่เข้ามาระหว่างหน้าเตรียมเกม/ระหว่างเกม → เพิ่มเข้าคิวในหน้าตั้งค่าอัตโนมัติ */
function addToSetup(ctx: Ctx, changes: Changes) {
  if (ctx.room.stage === "lobby") return;
  const setup = clone(ctx.setup);
  if (!setup.ohana.participants.includes(ctx.actor)) setup.ohana.participants.push(ctx.actor);
  if (!setup.challenge.participants.includes(ctx.actor)) setup.challenge.participants.push(ctx.actor);
  if (!setup.guess.participants.includes(ctx.actor)) setup.guess.participants.push(ctx.actor);
  if (!setup.spy.participants.includes(ctx.actor)) setup.spy.participants.push(ctx.actor);
  if (!setup.fill.participants.includes(ctx.actor)) setup.fill.participants.push(ctx.actor);
  if (!setup.words.soloOrder.includes(ctx.actor)) setup.words.soloOrder.push(ctx.actor);
  changes.setup = setup;
}
