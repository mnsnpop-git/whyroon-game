// ===== Shared types (ใช้ทั้ง client และ server) =====

export type GameId = "ohana" | "words" | "werewolf" | "challenge" | "guess" | "spy" | "fill";
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
  avatar?: string | null; // รูปโปรไฟล์ (data URL ขนาดเล็ก) — null = ใช้ emoji
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
  | "thaiStars"
  | "singers"
  | "cars"
  | "stores"
  | "restaurants"
  | "fashion"
  | "songs"
  | "all";

/** ขอบเขตคำ: เฉพาะในไทย หรือ รวมสากล (มีผลกับหมวดที่แยกไทย/สากลได้ และหมวดสุ่มรวม) */
export type WordScope = "th" | "global";

export interface WordsSetup {
  mode: "solo" | "team";
  category: WordCategory;
  scope: WordScope;
  seconds: 60 | 180 | 300 | 600;
  teams: WordsTeam[];
  soloOrder: string[];
}

export interface ChallengeSetup {
  participants: string[]; // ลำดับคิวจั่วการ์ด
  timers: boolean; // เปิดนับถอยหลังสำหรับการ์ดคำสั่งที่มีเวลา
}

export interface GuessSetup {
  participants: string[]; // ลำดับคนใบ้
  seconds: 30 | 60 | 90 | 120;
  laps: 1 | 2 | 3; // ใบ้คนละกี่รอบ
  giverPoint: boolean; // คนใบ้ได้ +1 ด้วยเมื่อมีคนทายถูก
}

export interface SpySetup {
  participants: string[];
  minutes: 3 | 5 | 8 | 10;
  spies: number; // จำนวนสายลับ (ต้องน้อยกว่าจำนวนผู้เล่น — สูงสุด ผู้เล่น-2)
}

export interface FillSetup {
  participants: string[];
  mode: "solo" | "team";
  teams: WordsTeam[];
  questions: 5 | 10 | 15;
  seconds: 15 | 30 | 45 | 60;
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
  challenge: ChallengeSetup;
  guess: GuessSetup;
  spy: SpySetup;
  fill: FillSetup;
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
  needDrinkPick?: boolean; // รอคนจั่วเลือกคนดื่ม (ดู DRINK_PICK)
  drinkers?: string[]; // คนที่ดื่มจากไพ่ใบนี้ (รวมวงบัดดี้ที่โดนตามแล้ว)
  drinkAmount?: number; // ดื่มคนละกี่แก้ว (ค่าเริ่มต้น 1)
}

export interface DrinkEvent {
  id: number;
  targets: string[]; // คนที่ดื่ม (รวมวงบัดดี้แล้ว)
  amount: number; // คนละกี่แก้ว
  reason: string;
  by: string; // คนที่บันทึก
  at: number;
  drawId?: number; // มาจากไพ่ใบไหน
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
  drinks?: Record<string, number>; // ยอดดื่มสะสมทั้งเกม (optional เพื่อรองรับเกมเก่า)
  drinkBy?: Record<string, Record<string, number>>; // ยอดดื่มแยกตามสาเหตุ ของแต่ละคน
  drinkLog?: DrinkEvent[]; // ล่าสุดอยู่หน้า
  drinkSeq?: number;
  finishedAt?: number | null; // กดจบเกมแล้ว → แสดงหน้าสรุป
  jack?: string | null; // คนที่จั่ว J ล่าสุด (optional เพื่อรองรับเกมที่เริ่มก่อนเพิ่มฟิลด์นี้)
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
  pausedAt?: number | null; // หยุดเกมชั่วคราวอยู่ (เวลาเซิร์ฟเวอร์ตอนกดหยุด)
}

export interface WordsRoundLog {
  unitId: string;
  giver: string;
  correct: number;
  count: number;
}

export interface WordsState {
  kind: "words";
  mode: "solo" | "team";
  category: WordCategory;
  scope?: WordScope; // optional เพื่อรองรับเกมที่เริ่มก่อนเพิ่มฟิลด์นี้ (ถือว่า "global")
  seconds: number;
  units: WordsUnit[];
  unitTurn: number;
  phase: "ready" | "playing" | "summary";
  round: WordsRound | null;
  lastRound: (WordsRound & { words: WordResult[] }) | null;
  roundNo: number;
  history?: WordsRoundLog[]; // ผลของทุกรอบ (optional เพื่อรองรับเกมที่เริ่มก่อนเพิ่มฟิลด์นี้)
  finishedAt?: number | null; // กดจบเกมแล้ว → แสดงหน้าสรุปผล
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

// ---------- Challenge & Forbidden ----------
export type ChallengeDeck = "challenge" | "forbidden";

export interface ChallengeCard {
  text: string;
  seconds?: number; // การ์ดคำสั่งบางใบมีเวลาจำกัด
}

export interface ChallengeActive {
  id: number; // เลขลำดับการจั่ว (ใช้กันกดซ้ำ)
  deck: ChallengeDeck;
  index: number; // ตำแหน่งการ์ดในสำรับ
  text: string;
  by: string; // คนที่จั่ว = คนถือการ์ด
  at: number;
  endsAt: number | null;
  seconds?: number | null; // เวลาของการ์ดคำสั่ง (เริ่มนับเมื่อรับคำท้า)
  startedAt?: number | null; // เวลาที่เริ่มนับถอยหลัง
  response?: "accepted" | "drank" | null; // การ์ดคำสั่ง: คนถือเลือกรับคำท้า หรือยอมดื่ม
}

export interface ChallengeFail {
  id: number;
  player: string;
  by: string; // คนที่กดแจ้ง
  cardId?: number | null; // พลาดเพราะการ์ดใบไหน (id ของการ์ด)
  cardBy?: string | null; // เจ้าของการ์ดใบนั้น (คนที่ทำให้พลาด)
  drank?: boolean; // มาจากการกด "ยอมดื่ม" ไม่รับคำท้า
  deck: ChallengeDeck | null;
  text: string | null;
  at: number;
}

export interface ChallengeState {
  kind: "challenge";
  order: string[];
  turn: number;
  timers: boolean;
  remaining: Record<ChallengeDeck, number>; // ใบที่เหลือในสำรับรอบนี้
  shuffles: number; // สลับสำรับไปแล้วกี่ครั้ง
  drawn: number; // จำนวนการ์ดที่จั่วทั้งเกม
  drawnBy: Record<ChallengeDeck, number>;
  active: ChallengeActive | null;
  recent?: ChallengeActive[]; // การ์ดที่จั่วล่าสุด (ใหม่สุดอยู่หน้า) ไว้เลือกตอนแจ้งทำพลาด
  lastForbidden?: Record<string, { id: number; text: string; at: number }>; // การ์ดห้ามใบล่าสุดที่แต่ละคนจั่ว
  fails: Record<string, number>;
  caused?: Record<string, number>; // จำนวนครั้งที่การ์ดของคนนี้ทำให้คนอื่นพลาด // ทำพลาดกี่ครั้ง (= ดื่มกี่แก้ว)
  failLog: ChallengeFail[]; // ล่าสุดอยู่หน้า
  failSeq: number;
  finishedAt: number | null;
}

// ---------- ใบ้คำ-ทายคำ ----------
export type GuessPhase = "setup" | "guessing" | "reveal" | "finished";

export interface GuessChat {
  id: number;
  player: string;
  text: string;
  at: number;
  hit?: boolean; // ทายตรงกับคำลับ
}

export interface GuessResult {
  turnNo: number;
  giver: string;
  word: string;
  winner: string | null;
  result: "correct" | "timeout" | "skip";
}

export interface GuessState {
  kind: "guess";
  order: string[];
  seconds: number;
  laps: number;
  giverPoint: boolean;
  turnNo: number; // ตาที่เท่าไหร่ (เริ่ม 0) — คนใบ้ = order[turnNo % order.length]
  phase: GuessPhase;
  round: { giver: string; startsAt: number; endsAt: number } | null;
  reveal: GuessResult | null; // ผลของตาที่เพิ่งจบ (เฉลยคำ)
  scores: Record<string, number>; // ทายถูกกี่ครั้ง
  giverScores: Record<string, number>; // ใบ้แล้วมีคนทายถูกกี่ครั้ง
  history: GuessResult[];
  chat: GuessChat[]; // คำตอบที่พิมพ์ในตานี้ (ล่าสุดอยู่ท้าย)
  chatSeq: number;
  drinks: Record<string, number>; // บันทึกการดื่มจากบทลงโทษ (สะสมข้ามเกม)
  penaltyRecorded: boolean;
  finishedAt: number | null;
}

export interface GuessSecret {
  kind: "guess";
  word: string; // คำลับ — เห็นเฉพาะคนใบ้
}

// ---------- ใครคือสายลับ ----------
export interface SpyAccusation {
  id: number;
  by: string;
  target: string;
  votes: Record<string, boolean>; // true = เห็นด้วยว่าเป็นสายลับ
  at: number;
}

export type SpyEndReason =
  | "caught" // โหวตจับสายลับได้
  | "wrongAccuse" // โหวตจับผิดคน
  | "timeout" // หมดเวลา สายลับรอด
  | "spyGuessed" // สายลับทายสถานที่ถูก
  | "spyMissed" // สายลับทายสถานที่ผิด
  | "host" // หัวหน้าห้องสั่งเฉลย
  | "spyLeft" // สายลับออกจากห้องหมด
  | "tooFew"; // ผู้เล่นเหลือไม่พอ

export interface SpyResult {
  winner: "spies" | "locals" | null;
  reason: SpyEndReason;
  spies: string[];
  location: number;
  roles: Record<string, string>;
  accused: string | null;
  guess: { by: string; location: number } | null;
  at: number;
}

export interface SpyState {
  kind: "spy";
  round: number;
  order: string[];
  minutes: number;
  spyCount: number;
  phase: "playing" | "ended";
  startsAt: number;
  endsAt: number;
  pausedAt: number | null;
  firstAsker: string;
  accusation: SpyAccusation | null;
  accusationSeq: number;
  accusedBy: string[]; // คนที่ใช้สิทธิ์ชี้ตัวไปแล้วในรอบนี้
  lastVote: { by: string; target: string; yes: number; no: number; at: number } | null; // โหวตล่าสุดที่ไม่ผ่าน
  result: SpyResult | null;
  wins: { spies: number; locals: number };
  drinks: Record<string, number>;
  penaltyRecorded: boolean;
}

export interface SpySecret {
  kind: "spy";
  spy: boolean;
  location: number | null; // สายลับ = null
  role: string | null;
}

// ---------- เติมคำในช่องว่าง ----------
export interface FillTeam {
  id: string;
  name: string;
  color: string;
  members: string[];
}

export interface FillReveal {
  no: number;
  word: string;
  category: string;
  winner: string | null;
  team: string | null;
  at: number;
  nextAt: number; // ไปข้อถัดไปอัตโนมัติเมื่อถึงเวลานี้
}

export interface FillState {
  kind: "fill";
  mode: "solo" | "team";
  order: string[];
  teams: FillTeam[];
  total: number;
  seconds: number;
  qNo: number; // ข้อที่ (เริ่ม 0)
  phase: "question" | "reveal" | "finished";
  question: {
    no: number;
    tiles: (string | null)[]; // null = ช่องที่ซ่อน, " " = เว้นวรรค
    category: string;
    startsAt: number;
    endsAt: number;
  } | null;
  reveal: FillReveal | null;
  scores: Record<string, number>;
  teamScores: Record<string, number>;
  feed: { id: number; player: string; text: string; at: number }[]; // คำตอบที่ผิดในข้อนี้
  feedSeq: number;
  history: FillReveal[];
  drinks: Record<string, number>;
  penaltyRecorded: boolean;
  finishedAt: number | null;
}

export type GameState =
  | OhanaState
  | WordsState
  | WerewolfState
  | ChallengeState
  | GuessState
  | SpyState
  | FillState;
export type PlayerSecret = WordsSecret | WerewolfSecret | GuessSecret | SpySecret;

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
