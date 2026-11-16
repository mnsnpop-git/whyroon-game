import { DEFAULT_TEAM_NAMES, EMOJIS, TEAM_COLORS, defaultSetup } from "../constants";
import type {
  GameId,
  GameSetup,
  OhanaSetup,
  Player,
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
  activePlayers,
  clone,
  isActive,
  requireHost,
  requireMember,
  shuffle,
  str,
} from "./core";
import { ohanaAction, ohanaRemovePlayer, startOhana } from "./ohana";
import { startWerewolf, werewolfAction, werewolfRemovePlayer } from "./werewolf";
import { startWords, wordsAction, wordsRemovePlayer } from "./words";

export { GameError } from "./core";
export type { Changes, Ctx } from "./core";

const MAX_PLAYERS = 30;
const GAME_IDS: GameId[] = ["ohana", "words", "werewolf"];

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

/** ค่า setup ที่ครบทุกช่อง (เติมค่า default ให้ส่วนที่ขาด) */
export function fullSetup(raw: Partial<GameSetup> | null | undefined): GameSetup {
  const d = defaultSetup();
  return {
    ohana: { ...d.ohana, ...(raw?.ohana ?? {}) },
    words: { ...d.words, ...(raw?.words ?? {}) },
    werewolf: {
      ...d.werewolf,
      ...(raw?.werewolf ?? {}),
      roles: { ...d.werewolf.roles, ...(raw?.werewolf?.roles ?? {}) },
    },
  };
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
  return { mode, category, seconds, teams, soloOrder: idList(ctx, raw.soloOrder) };
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
  setup.words.soloOrder = setup.words.soloOrder.filter((x) => x !== id);
  setup.words.teams = setup.words.teams.map((t) => ({
    ...t,
    members: t.members.filter((x) => x !== id),
  }));
  changes.setup = setup;

  if (ctx.room.stage === "playing" && ctx.state) {
    if (ctx.state.kind === "ohana") changes.state = ohanaRemovePlayer(ctx.state, id);
    if (ctx.state.kind === "words") changes.state = wordsRemovePlayer(ctx.state, id);
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
      });
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
      else if (game === "words") setup.words = sanitizeWords(ctx, raw);
      else if (game === "werewolf") setup.werewolf = sanitizeWerewolf(raw);
      else throw new GameError("ไม่รู้จักเกมนี้");
      return { setup };
    }

    case "setup.pickTeam": {
      if (ctx.room.stage !== "setup" || ctx.room.game !== "words") {
        throw new GameError("ตอนนี้ยังเลือกทีมไม่ได้");
      }
      const teamId = str(p, "teamId", 24);
      const setup = clone(ctx.setup);
      if (!setup.words.teams.some((t) => t.id === teamId)) throw new GameError("ไม่พบทีมนี้");
      setup.words.teams = setup.words.teams.map((t) => {
        const members = t.members.filter((id) => id !== ctx.actor);
        if (t.id === teamId) members.push(ctx.actor);
        return { ...t, members };
      });
      return { setup };
    }

    case "setup.autoTeams": {
      requireHost(ctx);
      const setup = clone(ctx.setup);
      const teams = setup.words.teams.length >= 2 ? setup.words.teams : defaultTeams();
      const ids = shuffle(activePlayers(ctx).map((x) => x.id));
      const buckets: string[][] = teams.map(() => []);
      ids.forEach((id, i) => buckets[i % teams.length].push(id));
      setup.words.teams = teams.map((t, i) => ({ ...t, members: buckets[i] }));
      return { setup };
    }

    case "game.start": {
      requireHost(ctx);
      if (ctx.room.stage !== "setup" || !ctx.room.game) throw new GameError("ยังไม่ได้เลือกเกม");
      if (ctx.room.game === "ohana") return startOhana(ctx);
      if (ctx.room.game === "words") return startWords(ctx);
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
  throw new GameError("ไม่รู้จักคำสั่งนี้");
}

function join(ctx: Ctx, p: Payload): Changes | null {
  const nickname = cleanNickname(p.nickname);
  const emoji = cleanEmoji(p.emoji);
  const existing = ctx.players.find((x) => x.id === ctx.actor);
  if (existing) {
    if (existing.status === "active" && existing.nickname === nickname && existing.emoji === emoji) {
      return null;
    }
    const changes: Changes = { players: [{ ...existing, nickname, emoji, status: "active" }] };
    if (existing.status !== "active") addToSetup(ctx, changes);
    return changes;
  }
  if (activePlayers(ctx).length >= MAX_PLAYERS) throw new GameError("ห้องเต็มแล้ว (สูงสุด 30 คน)");
  const player: Player = {
    id: ctx.actor,
    nickname,
    emoji,
    status: "active",
    joined_at: new Date(ctx.now).toISOString(),
  };
  const changes: Changes = { players: [player] };
  addToSetup(ctx, changes);
  if (activePlayers(ctx).length === 0) changes.room = { host_id: ctx.actor };
  return changes;
}

/** ผู้เล่นใหม่ที่เข้ามาระหว่างหน้าเตรียมเกม → เพิ่มเข้าคิวอัตโนมัติ */
function addToSetup(ctx: Ctx, changes: Changes) {
  if (ctx.room.stage !== "setup") return;
  const setup = clone(ctx.setup);
  if (!setup.ohana.participants.includes(ctx.actor)) setup.ohana.participants.push(ctx.actor);
  if (!setup.words.soloOrder.includes(ctx.actor)) setup.words.soloOrder.push(ctx.actor);
  changes.setup = setup;
}
