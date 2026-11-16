import type { GameId, GameSetup, Rank, WWRole } from "./types";

export const EMOJIS = [
  "🐸", "🦄", "🐷", "🐵", "🙈", "🐔", "🦖", "🐙",
  "🦊", "🐼", "🐨", "🐯", "🤡", "👻", "👽", "🤖",
  "💩", "🥑", "🍕", "🌶️", "🦩", "🐧", "🐳", "🦥",
  "🤠", "😎", "🥸", "🤪", "🧟", "🦸", "🐶", "🐱",
];

export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // ไม่มี I, O กันสับสน

export const TEAM_COLORS = [
  { id: "violet", hex: "#8B5CF6", name: "ม่วง" },
  { id: "pink", hex: "#EC4899", name: "ชมพู" },
  { id: "yellow", hex: "#FACC15", name: "เหลือง" },
  { id: "mint", hex: "#10B981", name: "เขียว" },
  { id: "coral", hex: "#EF4444", name: "แดง" },
  { id: "sky", hex: "#38BDF8", name: "ฟ้า" },
];

export const DEFAULT_TEAM_NAMES = ["ทีมหมูกระทะ", "ทีมส้มตำ", "ทีมชาไข่มุก", "ทีมข้าวเหนียว"];

export const GAMES: {
  id: GameId;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  players: string;
}[] = [
  {
    id: "ohana",
    title: "การ์ดโอฮาน่า",
    subtitle: "เกมไพ่ปาร์ตี้ จั่วแล้วทำตามกติกา",
    emoji: "🃏",
    color: "#EC4899",
    players: "เล่นเดี่ยว วนตามลำดับ",
  },
  {
    id: "words",
    title: "ใบ้คำแข่งเวลา",
    subtitle: "ใบ้ให้ไว ทายให้ถูก ก่อนหมดเวลา",
    emoji: "⏱️",
    color: "#FACC15",
    players: "เดี่ยว หรือ แบ่งทีม",
  },
  {
    id: "werewolf",
    title: "Werewolf",
    subtitle: "ล่าปริศนามนุษย์หมาป่าในหมู่บ้าน",
    emoji: "🐺",
    color: "#8B5CF6",
    players: "ทุกคนในห้อง (4 คนขึ้นไป)",
  },
];

// ---------- Ohana ----------
export const CARD_RULES: Record<Rank, { title: string; detail: string; icon: string }> = {
  A: { title: "ดื่ม 1 แก้ว", detail: "คนจั่วดื่มเองเลย 1 แก้ว", icon: "🍺" },
  "2": { title: "หาเพื่อนดื่ม 1 คน", detail: "เลือกเพื่อน 1 คน ดื่มด้วยกันคนละ 1 แก้ว", icon: "🍻" },
  "3": { title: "หาเพื่อนดื่ม 2 คน", detail: "เลือกเพื่อน 2 คน ดื่มด้วยกันคนละ 1 แก้ว", icon: "🥂" },
  "4": { title: "คนซ้ายมือดื่ม", detail: "คนที่นั่งซ้ายมือ ดื่ม 1 แก้ว", icon: "⬅️" },
  "5": { title: "ห้าเฮฮา!", detail: "ดื่มรอบวง ทุกคนคนละ 1 แก้ว", icon: "⭕" },
  "6": { title: "คนขวามือดื่ม", detail: "คนที่นั่งขวามือ ดื่ม 1 แก้ว", icon: "➡️" },
  "7": {
    title: "บัดดี้!",
    detail: "ใครในวงบัดดี้โดนดื่ม ทุกคนในวงต้องดื่มตามจำนวนที่โดน",
    icon: "👯",
  },
  "8": { title: "พักผ่อน 2 นาที", detail: "ต้องใช้เลย เก็บไว้ไม่ได้!", icon: "⏱️" },
  "9": { title: "มินิเกม!", detail: "คนจั่วเริ่มมินิเกม ใครแพ้ดื่ม 1 แก้ว", icon: "🎮" },
  "10": {
    title: "ตั้งกฎในเกม!",
    detail: "ใครทำไม่ได้ดื่ม 1 แก้ว (กฎเปลี่ยนเมื่อมีคนจั่ว 10 ใบถัดไป)",
    icon: "📜",
  },
  J: { title: "แจ็คจับหน้า!", detail: "ทำท่าทางบนใบหน้าตามคนที่ได้ J ใครทำช้าสุดดื่ม 1 แก้ว", icon: "😜" },
  Q: { title: "แหม่มไม่มีเพื่อนคบ!", detail: "ห้ามคุยกับคนที่เป็น Q ใครเผลอคุยด้วยดื่ม 1 แก้ว", icon: "🤐" },
  K: { title: "กติกาพิเศษ K", detail: "", icon: "👑" },
};

export const K_RULE_SUGGESTIONS = [
  "คนจั่วเลือกใครก็ได้ 1 คน ดื่มหมดแก้ว",
  "ทุกคนชนแก้วแล้วดื่มพร้อมกัน",
  "คนที่ใส่เสื้อสีดำดื่ม 1 แก้ว",
  "คนที่โสดในวงดื่ม 1 แก้ว",
  "คนที่อายุน้อยที่สุดดื่ม 1 แก้ว",
  "คนจั่วต้องเล่าเรื่องน่าอายที่สุด หรือดื่ม 2 แก้ว",
  "ทุกคนชี้คนที่น่าจะเมาก่อน คนโดนชี้มากสุดดื่ม",
  "คนที่โทรศัพท์แบตน้อยที่สุดดื่ม 1 แก้ว",
  "คนจั่วต้องร้องเพลง 1 ท่อน ไม่งั้นดื่ม 2 แก้ว",
  "คนที่มาสายที่สุดวันนี้ดื่ม 1 แก้ว",
  "ห้ามพูดคำว่า 'เหล้า' จนกว่าจะเจอ K ใบถัดไป",
  "คนจั่วผสมเครื่องดื่มแก้วพิเศษให้คนขวามือ",
  "ทุกคนที่มีแฟนดื่ม 1 แก้ว",
  "คนจั่วถามคำถาม Truth ใครก็ได้ 1 ข้อ ไม่ตอบดื่ม",
  "ดื่มแก้วสุดท้ายแห่งความหายนะ! (K ใบสุดท้าย ดื่มหมดแก้ว)",
  "ใครไปห้องน้ำล่าสุดดื่ม 1 แก้ว",
];

export const MINI_GAMES = [
  "เป่ายิ้งฉุบ แพ้คัดออก",
  "แปะเลข 7 (ห้ามพูดเลขที่มี 7 หรือหาร 7 ลงตัว)",
  "บอกชื่อยี่ห้อรถ ห้ามซ้ำ ห้ามช้า",
  "บอกชื่อผลไม้ ห้ามซ้ำ ห้ามช้า",
  "ซ้ายขวาไม่ตรงกัน (ชี้ผิดทาง)",
  "นับเลข 1-20 ห้ามพูดพร้อมกัน",
  "บอกชื่อจังหวัดในไทย ห้ามซ้ำ",
  "ใครพูดคำต่อท้ายไม่ทัน (เกมต่อคำ)",
  "หัวแม่มือ! วางนิ้วโป้งบนโต๊ะช้าสุดแพ้",
  "บอกชื่อดารา/นักร้อง ห้ามซ้ำ",
  "ยิงปืนสวนกลับ (ปัง-หลบ-ยิง)",
  "เกมหมูมาหมาไป",
];


// ---------- Werewolf ----------
export const ROLE_INFO: Record<
  WWRole,
  { name: string; emoji: string; color: string; team: "wolves" | "villagers"; desc: string }
> = {
  werewolf: {
    name: "มนุษย์หมาป่า",
    emoji: "🐺",
    color: "#EF4444",
    team: "wolves",
    desc: "ตื่นตอนกลางคืนเพื่อเลือกสังหารผู้เล่น 1 คน ร่วมกับหมาป่าตัวอื่น",
  },
  seer: {
    name: "ผู้หยั่งรู้",
    emoji: "🔮",
    color: "#8B5CF6",
    team: "villagers",
    desc: "ตื่นตอนกลางคืนเพื่อส่องดูผู้เล่น 1 คนว่าเป็นหมาป่าหรือไม่",
  },
  doctor: {
    name: "หมอ",
    emoji: "🩺",
    color: "#10B981",
    team: "villagers",
    desc: "ตื่นตอนกลางคืนเพื่อปกป้องผู้เล่น 1 คน (ปกป้องตัวเองได้)",
  },
  hunter: {
    name: "พรานป่า",
    emoji: "🏹",
    color: "#FACC15",
    team: "villagers",
    desc: "ถ้าถูกฆ่าหรือถูกโหวตออก ยิงผู้เล่น 1 คนให้ตายตามไปได้ทันที",
  },
  villager: {
    name: "ชาวบ้าน",
    emoji: "🧑",
    color: "#38BDF8",
    team: "villagers",
    desc: "ไม่มีพลังพิเศษ ช่วยกันจับผิดและโหวตหาหมาป่าตอนกลางวัน",
  },
};

export function defaultSetup(): GameSetup {
  return {
    ohana: {
      participants: [],
      kRules: [
        K_RULE_SUGGESTIONS[0],
        K_RULE_SUGGESTIONS[1],
        K_RULE_SUGGESTIONS[5],
        K_RULE_SUGGESTIONS[14],
      ],
      decks: 1,
    },
    words: {
      mode: "team",
      category: "all",
      seconds: 60,
      teams: [],
      soloOrder: [],
    },
    werewolf: {
      roles: { werewolf: 1, seer: 1, doctor: 1, hunter: 0 },
      nightSeconds: 30,
      discussSeconds: 180,
      voteSeconds: 60,
    },
  };
}
