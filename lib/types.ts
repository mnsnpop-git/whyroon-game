// ===== Shared types (ใช้ทั้ง client และ server) =====

export type GameId = "ohana" | "words" | "werewolf";
export type Stage = "lobby" | "setup" | "playing";

export interface Room {
  code: string;
  host_id: string;
  stage: Stage;
  game: GameId | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  room_code?: string;
  id: string;
  nickname: string;
  emoji: string;
  status: "active" | "kicked" | "left";
  joined_at: string;
}

// ---------- Setup ----------
export interface OhanaSetup {
  participants: string[]; // ลำดับคิว (เฉพาะคนที่ถูกเชิญ)
  kRules: [string, string, string, string];
  decks: 1 | 2;
}

export interface WordsTeam {
  id: string;
  name: string;
  color: string;
  members: string[]; // ลำดับคนใบ้ภายในทีม
}

export type WordCategory =
  | "movies"
  | "food"
  | "animals"
  | "slang"
  | "jobs"
  | "items"
  | "all";

export interface WordsSetup {
  mode: "solo" | "team";
  category: WordCategory;
  seconds: 60 | 180 | 300 | 600;
  teams: WordsTeam[];
  soloOrder: string[];
}

export type WWRole = "werewolf" | "seer" | "doctor" | "hunter" | "villager";

export interface WerewolfSetup {
  roles: { werewolf: number; seer: number; doctor: number; hunter: number };
  nightSeconds: number;
  discussSeconds: number;
  voteSeconds: number;
}

export interface GameSetup {
  ohana: OhanaSetup;
  words: WordsSetup;
  werewolf: WerewolfSetup;
}

// ---------- Ohana ----------
export type Rank =
  | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Suit = "♠" | "♥" | "♦" | "♣";
export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface OhanaDraw {
  id: number;
  card: Card;
  by: string;
  kIndex?: number; // 0..3 สำหรับไพ่ K
  kRule?: string;
  miniGame?: string;
  buddyJoined?: boolean; // ไพ่ 7 ที่เข้าวงบัดดี้อัตโนมัติ
  needBuddyPick?: boolean; // ไพ่ 7 ใบแรกที่ต้องเลือกบัดดี้
}

export interface OhanaState {
  kind: "ohana";
  order: string[];
  turn: number;
  total: number;
  remaining: number;
  kRules: string[];
  kCount: number;
  current: OhanaDraw | null;
  history: OhanaDraw[];
  buddies: string[];
  rule: { text: string; by: string } | null;
  queen: string | null;
  restTimer: { by: string; endsAt: number } | null;
}

// ---------- Words ----------
export interface WordsUnit {
  id: string;
  name: string;
  color: string;
  members: string[];
  score: number;
  nextMember: number;
}

export interface WordResult {
  text: string;
  result: "correct" | "pass";
}

export interface WordsRound {
  unitId: string;
  giver: string;
  startsAt: number;
  endsAt: number;
  count: number; // จำนวนคำที่ตัดสินแล้ว
  correct: number;
}

export interface WordsState {
  kind: "words";
  mode: "solo" | "team";
  category: WordCategory;
  seconds: number;
  units: WordsUnit[];
  unitTurn: number;
  phase: "ready" | "playing" | "summary";
  round: WordsRound | null;
  lastRound: (WordsRound & { words: WordResult[] }) | null;
  roundNo: number;
}

export interface WordsSecret {
  kind: "words";
  deck: string[]; // คำที่จะใช้ (เรียงแล้ว) — เห็นเฉพาะคนใบ้
}

// ---------- Werewolf ----------
export type WWPhase =
  | "night"
  | "day"
  | "vote"
  | "voteResult"
  | "hunter"
  | "ended";

export type NightStep = "werewolf" | "seer" | "doctor";

export interface WerewolfState {
  kind: "werewolf";
  players: string[];
  dead: string[];
  phase: WWPhase;
  day: number;
  nightStep: NightStep | null;
  stepEndsAt: number | null;
  phaseEndsAt: number | null;
  rolesInGame: Record<WWRole, number>;
  nightResult: { killed: string | null; savedSomeone: boolean } | null;
  voted: string[];
  voteResult: {
    eliminated: string | null;
    tally: Record<string, number>;
    skips: number;
    votes: Record<string, string>;
  } | null;
  hunter: { id: string; endsAt: number; then: "day" | "night" } | null;
  hunterShot: { by: string; target: string | null } | null;
  revealed: Record<string, WWRole>;
  winner: "wolves" | "villagers" | null;
  allRoles: Record<string, WWRole> | null;
  log: string[];
  settings: { nightSeconds: number; discussSeconds: number; voteSeconds: number };
}

export interface WerewolfSecret {
  kind: "werewolf";
  role: WWRole;
  wolves?: string[];
  wolfPicks?: Record<string, string>;
  seerResults?: { night: number; target: string; isWolf: boolean }[];
  myAction?: { night: number; step: NightStep; target: string } | null;
  myVote?: { day: number; target: string } | null;
}

export interface WerewolfGameSecret {
  roles: Record<string, WWRole>;
  wolfPicks: Record<string, string>;
  seerTarget: string | null;
  doctorTarget: string | null;
  votes: Record<string, string>;
  lastDoctorTarget?: string | null;
}

export type GameState = OhanaState | WordsState | WerewolfState;
export type PlayerSecret = WordsSecret | WerewolfSecret;

export interface Snapshot {
  room: Room;
  players: Player[];
  setup: Partial<GameSetup> | null;
  state: GameState | null;
  secret: PlayerSecret | null;
  now: number;
}

export interface ActionRequest {
  type: string;
  code?: string;
  payload?: Record<string, unknown>;
}

export interface ActionResponse {
  ok: boolean;
  error?: string;
  serverNow: number;
  data?: Record<string, unknown>;
}
