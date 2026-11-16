import type { GameSetup, GameState, Player, Room } from "../types";

/** ข้อผิดพลาดที่แสดงให้ผู้เล่นเห็นได้ (ข้อความภาษาไทย) */
export class GameError extends Error {}

export interface Ctx {
  room: Room;
  players: Player[];
  setup: GameSetup;
  state: GameState | null;
  gameSecret: Record<string, unknown> | null;
  playerSecrets: Record<string, Record<string, unknown>>;
  actor: string;
  now: number;
}

export interface Changes {
  room?: Partial<Pick<Room, "host_id" | "stage" | "game">>;
  players?: Player[];
  setup?: GameSetup;
  state?: GameState | null;
  gameSecret?: unknown | null;
  clearPlayerSecrets?: boolean;
  playerSecrets?: Record<string, unknown | null>;
}

export type Payload = Record<string, unknown>;

export function isHost(ctx: Ctx) {
  return ctx.room.host_id === ctx.actor;
}

export function requireHost(ctx: Ctx) {
  if (!isHost(ctx)) throw new GameError("เฉพาะหัวหน้าห้องเท่านั้นที่ทำได้");
}

export function activePlayers(ctx: Pick<Ctx, "players">) {
  return ctx.players.filter((p) => p.status === "active");
}

export function isActive(ctx: Pick<Ctx, "players">, id: string) {
  return ctx.players.some((p) => p.id === id && p.status === "active");
}

export function requireMember(ctx: Ctx) {
  if (!isActive(ctx, ctx.actor)) throw new GameError("คุณไม่ได้อยู่ในห้องนี้แล้ว");
}

export function nameOf(ctx: Pick<Ctx, "players">, id: string | null | undefined) {
  if (!id) return "-";
  const p = ctx.players.find((x) => x.id === id);
  return p ? `${p.emoji} ${p.nickname}` : "ผู้เล่นที่ออกไปแล้ว";
}

function randomInt(max: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function shuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(arr.length)];
}

export function randomBetween(min: number, max: number) {
  return min + randomInt(max - min + 1);
}

// ---------- payload helpers ----------
export function str(p: Payload, key: string, max = 200): string {
  const v = p[key];
  if (typeof v !== "string") throw new GameError("ข้อมูลไม่ถูกต้อง");
  return v.trim().slice(0, max);
}

export function optStr(p: Payload, key: string, max = 200): string | null {
  const v = p[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new GameError("ข้อมูลไม่ถูกต้อง");
  return v.trim().slice(0, max);
}

export function num(p: Payload, key: string): number {
  const v = p[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new GameError("ข้อมูลไม่ถูกต้อง");
  return v;
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
