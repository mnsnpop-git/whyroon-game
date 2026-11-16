import type { GameId, GameSetup, Rank, WWRole } from "./types";

/** อิโมจิโปรไฟล์ แบ่งหมวด (หมวดแรก = ค่าเริ่มต้นของหน้าเลือก) */
export const EMOJI_GROUPS: { id: string; icon: string; name: string; emojis: string[] }[] = [
  { id: "faces", icon: "😎", name: "ตัวละคร", emojis: ["🤠", "😎", "🥸", "🤪", "🤡", "👻", "👽", "🤖", "💩", "🧟", "🦸", "🦹", "🧙", "🧚", "🧛", "🧜", "🧞", "🥷", "🤓", "😇", "🥳", "😜", "🤩", "😈", "👹", "👺", "💀", "🎃", "👶", "🧒", "👦", "👧", "🧑", "👱", "👩", "👨", "🧓", "👴", "👵"] },
  { id: "animals", icon: "🐶", name: "สัตว์", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🐇", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🦍", "🦧", "🐔", "🐓", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🦓", "🦒", "🐘", "🦣", "🦛", "🦏", "🐪", "🐫", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐈", "🐈‍⬛", "🐅", "🐆", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐢", "🐍", "🦎", "🦖", "🦕", "🐊", "🐉", "🐲", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🦭", "🐚", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🦂", "🦠"] },
  { id: "plants", icon: "🌵", name: "ต้นไม้ & ดอกไม้", emojis: ["🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺", "💐", "🌸", "💮", "🪷", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷"] },
  { id: "fruits", icon: "🍓", name: "ผลไม้", emojis: ["🍎", "🍏", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🫒"] },
  { id: "veggies", icon: "🥦", name: "ผัก", emojis: ["🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘", "🌰"] },
  { id: "food", icon: "🍕", name: "อาหาร", emojis: ["🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥟", "🥠", "🥡", "🦪"] },
  { id: "sweets", icon: "🍩", name: "ขนม & เครื่องดื่ม", emojis: ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🥮", "🍡", "🧋", "🥤", "🧃", "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🧊"] },
  { id: "weather", icon: "⛅", name: "อากาศ & ธรรมชาติ", emojis: ["☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌈", "☂️", "☔", "⚡", "🔥", "💧", "🌊", "🌙", "🌛", "🌝", "🌞", "⭐", "🌟", "✨", "☄️", "🌍", "🪐"] },
];

/** อิโมจิเดิมก่อนแบ่งหมวด — ต้องอยู่ในรายการเสมอ ไม่งั้นโปรไฟล์ที่บันทึกไว้จะใช้ไม่ได้ */
const LEGACY_EMOJIS = [
  "🐸", "🦄", "🐷", "🐵", "🙈", "🐔", "🦖", "🐙",
  "🦊", "🐼", "🐨", "🐯", "🤡", "👻", "👽", "🤖",
  "💩", "🥑", "🍕", "🌶️", "🦩", "🐧", "🐳", "🦥",
  "🤠", "😎", "🥸", "🤪", "🧟", "🦸", "🐶", "🐱",
];

/** ทุกอิโมจิที่เลือกได้ (ไม่ซ้ำ) — ใช้ตรวจฝั่งเซิร์ฟเวอร์ด้วย */
export const EMOJIS: string[] = Array.from(new Set([...LEGACY_EMOJIS, ...EMOJI_GROUPS.flatMap((g) => g.emojis)]));

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
  category: "board" | "quick";
  /** คำค้นเพิ่มเติม (อังกฤษ/คำพ้อง) สำหรับช่องค้นหาเกม */
  keywords: string;
}[] = [
  {
    id: "ohana",
    title: "Doraemon",
    subtitle: "เกมไพ่ปาร์ตี้ จั่วแล้วทำตามกติกา",
    emoji: "🃏",
    color: "#38BDF8",
    players: "เล่นเดี่ยว วนตามลำดับ",
    category: "board",
    keywords: "doraemon โดเรม่อน ไพ่ card cards drinking คิงส์คัพ kings cup จั่วไพ่",
  },
  {
    id: "words",
    title: "ใบ้คำแข่งเวลา",
    subtitle: "ใบ้ให้ไว ทายให้ถูก ก่อนหมดเวลา",
    emoji: "⏱️",
    color: "#F2C94C",
    players: "เดี่ยว หรือ แบ่งทีม",
    category: "quick",
    keywords: "word guessing charades ใบ้ ทายคำ แข่งเวลา ทีม team timer",
  },
  {
    id: "werewolf",
    title: "Werewolf",
    subtitle: "ล่าปริศนามนุษย์หมาป่าในหมู่บ้าน",
    emoji: "🐺",
    color: "#34D399",
    players: "ทุกคนในห้อง (4 คนขึ้นไป)",
    category: "board",
    keywords: "werewolf หมาป่า มนุษย์หมาป่า หมู่บ้าน social deduction ฆาตกร โหวต",
  },
  {
    id: "challenge",
    title: "ท้าทาย & ห้าม",
    subtitle: "จั่วการ์ดคำสั่งหรือการ์ดห้าม พลาดเมื่อไหร่ดื่ม!",
    emoji: "🎴",
    color: "#FB7185",
    players: "เล่นเดี่ยว วนตามลำดับ",
    category: "quick",
    keywords: "challenge forbidden truth dare ท้าทาย การ์ดห้าม คำสั่ง ดื่ม card",
  },
  {
    id: "guess",
    title: "ใบ้คำ-ทายคำ",
    subtitle: "คนใบ้ตั้งคำลับ เพื่อนแข่งกันทายก่อนหมดเวลา",
    emoji: "🤫",
    color: "#A3E635",
    players: "ผลัดกันเป็นคนใบ้ (2 คนขึ้นไป)",
    category: "quick",
    keywords: "guess word secret ใบ้คำ ทายคำ คำลับ charades",
  },
  {
    id: "spy",
    title: "ใครคือสายลับ?",
    subtitle: "ทุกคนรู้สถานที่ลับ ยกเว้นสายลับ — จับให้ได้ก่อนโดนหลอก",
    emoji: "🕵️",
    color: "#C084FC",
    players: "ทุกคนในห้อง (3 คนขึ้นไป)",
    category: "board",
    keywords: "spy สายลับ spyfall location สถานที่ จับผิด โหวต deduction",
  },
  {
    id: "fill",
    title: "เติมคำในช่องว่าง",
    subtitle: "เดาคำจากตัวอักษรที่โผล่มา ใครพิมพ์ถูกก่อนได้แต้ม",
    emoji: "🧩",
    color: "#22D3EE",
    players: "เดี่ยว หรือ แบ่งทีม (2 คนขึ้นไป)",
    category: "quick",
    keywords: "fill blank puzzle word เติมคำ ช่องว่าง ตัวอักษร พิมพ์ไว quiz",
  },
];

export const GAME_CATEGORIES = [
  { id: "board", title: "🎲 บอร์ดเกม", subtitle: "Board Games · เล่นยาว ใช้หัวคิด" },
  { id: "quick", title: "⚡ เกมไว", subtitle: "Quick Party Games · เล่นปุ๊บ ฮาปั๊บ" },
] as const;

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
  J: { title: "แจ็คจับหน้า!", detail: "คนที่ได้ J เป็นแจ็คจนกว่าจะมีคนจั่ว J ใบถัดไป เมื่อแจ็คทำท่าบนใบหน้า ทุกคนต้องทำตาม ใครช้าสุดดื่ม 1 แก้ว", icon: "😜" },
  Q: { title: "แหม่มไม่มีเพื่อนคบ!", detail: "ห้ามคุยกับคนที่เป็น Q ใครเผลอคุยด้วยดื่ม 1 แก้ว", icon: "🤐" },
  K: { title: "กติกาพิเศษ K", detail: "", icon: "👑" },
};

/**
 * ไพ่ที่ต้องเลือกคนดื่ม
 *  - min/max: จำนวนคนที่เลือกได้ (max = 0 คือไม่จำกัด)
 *  - withDrawer: คนจั่วดื่มด้วยเสมอ (ไม่ต้องเลือกตัวเอง)
 *  - allowDrawer: เลือกคนจั่วเองได้
 *  - neighbor: เลือกคนข้าง ๆ ไว้ให้ก่อน (ตามลำดับการจั่ว) -1 = คนก่อนหน้า, 1 = คนถัดไป
 *  - amount: ระบุจำนวนแก้วได้
 */
export const DRINK_PICK: Partial<
  Record<
    Rank,
    { label: string; min: number; max: number; withDrawer?: boolean; allowDrawer?: boolean; neighbor?: -1 | 1; amount?: boolean }
  >
> = {
  "2": { label: "เลือกเพื่อนดื่มด้วย 1 คน", min: 1, max: 1, withDrawer: true },
  "3": { label: "เลือกเพื่อนดื่มด้วย 2 คน", min: 2, max: 2, withDrawer: true },
  "4": { label: "ใครนั่งซ้ายมือ?", min: 1, max: 1, neighbor: -1 },
  "6": { label: "ใครนั่งขวามือ?", min: 1, max: 1, neighbor: 1 },
  "9": { label: "ใครแพ้มินิเกม?", min: 1, max: 0, allowDrawer: true, amount: true },
  J: { label: "ใครทำตามช้าสุด?", min: 1, max: 0, amount: true },
  K: { label: "ใครต้องดื่มตามกติกา K?", min: 0, max: 0, allowDrawer: true, amount: true },
};

/** สาเหตุการดื่มที่เกิดได้ทุกเวลา (ปุ่ม "สั่งดื่ม") */
export const DRINK_REASONS = [
  "😜 ทำตามแจ็คช้า (J)",
  "🤐 คุยกับแหม่ม (Q)",
  "✊ นิ้วโผล่ ไม่กำมือ",
  "📜 ผิดกฎข้อ 10",
  "🎮 แพ้มินิเกม",
  "👑 กติกา K",
];

export const cardDrinkReason = (rank: Rank) => `🃏 ไพ่ ${rank}`;

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
      scope: "global",
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
    challenge: {
      participants: [],
      timers: true,
    },
    guess: {
      participants: [],
      seconds: 60,
      laps: 1,
      giverPoint: true,
    },
    spy: {
      participants: [],
      minutes: 5,
      spies: 1,
    },
    fill: {
      participants: [],
      mode: "solo",
      teams: [],
      questions: 10,
      seconds: 30,
    },
  };
}

/** ค่า setup ที่ครบทุกช่อง (เติมค่า default ให้ส่วนที่ขาด) */
export function fullSetup(raw: Partial<GameSetup> | null | undefined): GameSetup {
  const d = defaultSetup();
  return {
    ohana: { ...d.ohana, ...(raw?.ohana ?? {}) },
    words: { ...d.words, ...(raw?.words ?? {}) },
    challenge: { ...d.challenge, ...(raw?.challenge ?? {}) },
    guess: { ...d.guess, ...(raw?.guess ?? {}) },
    spy: { ...d.spy, ...(raw?.spy ?? {}) },
    fill: { ...d.fill, ...(raw?.fill ?? {}) },
    werewolf: {
      ...d.werewolf,
      ...(raw?.werewolf ?? {}),
      roles: { ...d.werewolf.roles, ...(raw?.werewolf?.roles ?? {}) },
    },
  };
}
