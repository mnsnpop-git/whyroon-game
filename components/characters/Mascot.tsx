/**
 * ตัวละครประจำเว็บ "ร่า" (ผู้หญิง) และ "เริง" (ผู้ชาย) — วาดด้วย SVG ล้วน
 * ใช้ได้ทั้ง Server/Client Component ปรับขนาดด้วย className (เช่น "h-40 w-auto")
 *
 * <Mascot who="ra" mood="excited" pose="cheers" className="h-48" />
 */

export type MascotWho = "ra" | "roeng";
export type MascotMood = "happy" | "excited" | "surprised" | "wink" | "sleepy" | "sad";
export type MascotPose = "idle" | "wave" | "cheers" | "point";

export const MASCOTS: Record<MascotWho, { name: string; nameEn: string; bio: string }> = {
  ra: { name: "ร่า", nameEn: "Ra", bio: "สาวมวยผมคู่ สายปาร์ตี้ ชอบเป็นคนเริ่มเกม" },
  roeng: { name: "เริง", nameEn: "Roeng", bio: "หนุ่มผมชี้ พลังเหลือล้น ชนแก้วก่อนใครเพื่อน" },
};

export const MASCOT_MOODS: MascotMood[] = ["happy", "excited", "surprised", "wink", "sleepy", "sad"];
export const MASCOT_POSES: MascotPose[] = ["idle", "wave", "cheers", "point"];

const INK = "#2B2340";
const SKIN = "#FFDCC6";
const SKIN_SHADE = "#F5BFA3";

const LOOK: Record<
  MascotWho,
  { hair: string; hairShade: string; hoodie: string; hoodieShade: string; emblem: string; pants: string; shoes: string }
> = {
  ra: {
    hair: "#FF7EB3",
    hairShade: "#E85C97",
    hoodie: "#FACC15",
    hoodieShade: "#E2B10B",
    emblem: "#EC4899",
    pants: "#8B5CF6",
    shoes: "#FFFFFF",
  },
  roeng: {
    hair: "#3B2E63",
    hairShade: "#2A2050",
    hoodie: "#38BDF8",
    hoodieShade: "#1E9FD8",
    emblem: "#FACC15",
    pants: "#2A2440",
    shoes: "#EF4444",
  },
};

const line = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function Mascot({
  who,
  mood = "happy",
  pose = "idle",
  className = "",
  title,
}: {
  who: MascotWho;
  mood?: MascotMood;
  pose?: MascotPose;
  className?: string;
  /** ข้อความสำหรับ screen reader (ค่าเริ่มต้น: ชื่อตัวละคร) */
  title?: string;
}) {
  const c = LOOK[who];
  return (
    <svg
      viewBox="0 0 200 250"
      role="img"
      aria-label={title ?? MASCOTS[who].name}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* เงาพื้น */}
      <ellipse cx="100" cy="242" rx="48" ry="6" fill="#000" opacity="0.18" />

      {who === "ra" && <RaBackHair c={c} />}

      {/* ขา + รองเท้า */}
      <rect x="78" y="210" width="18" height="26" rx="8" fill={c.pants} {...line} />
      <rect x="104" y="210" width="18" height="26" rx="8" fill={c.pants} {...line} />
      <path d="M72 238 Q72 228 87 228 Q100 228 98 240 Z" fill={c.shoes} {...line} />
      <path d="M102 240 Q100 228 113 228 Q128 228 128 238 Z" fill={c.shoes} {...line} />

      {/* แขนข้างซ้าย (ฝั่งผู้ชม) ห้อยลง */}
      <Arm d="M64 168 Q48 186 52 206" hand={[53, 208]} color={c.hoodie} />

      {/* ตัว (ฮู้ดดี้) */}
      <path d="M60 222 Q56 172 78 158 L122 158 Q144 172 140 222 Q100 230 60 222 Z" fill={c.hoodie} {...line} />
      <path d="M66 214 Q100 222 134 214" fill="none" stroke={c.hoodieShade} strokeWidth="5" strokeLinecap="round" />
      {/* กระเป๋าหน้าท้อง */}
      <path d="M80 196 L120 196 L124 214 Q100 219 76 214 Z" fill={c.hoodieShade} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* เชือกฮู้ด */}
      <path d="M92 160 L90 180 M108 160 L110 180" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="90" cy="182" r="2.6" fill={c.emblem} stroke={INK} strokeWidth="1.5" />
      <circle cx="110" cy="182" r="2.6" fill={c.emblem} stroke={INK} strokeWidth="1.5" />
      {who === "ra" ? (
        <path d="M100 184 l3.2 6.6 7.2 1 -5.2 5 1.3 7.2 -6.5 -3.4 -6.5 3.4 1.3 -7.2 -5.2 -5 7.2 -1 Z" fill={c.emblem} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path d="M104 182 L94 196 L101 196 L97 208 L108 192 L101 192 Z" fill={c.emblem} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* แขนข้างขวา (ฝั่งผู้ชม) ตามท่า */}
      <RightArm pose={pose} color={c.hoodie} />

      {/* หู */}
      <circle cx="44" cy="104" r="10" fill={SKIN} {...line} />
      <circle cx="156" cy="104" r="10" fill={SKIN} {...line} />

      {/* หัว */}
      <ellipse cx="100" cy="98" rx="58" ry="55" fill={SKIN} {...line} />

      {who === "ra" ? <RaHair c={c} /> : <RoengHair c={c} />}

      <Face mood={mood} />
    </svg>
  );
}

// ---------- ชิ้นส่วน ----------
type Look = (typeof LOOK)[MascotWho];

function Arm({ d, hand, color }: { d: string; hand: [number, number]; color: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth="19" strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r="8" fill={SKIN} {...line} strokeWidth={3} />
    </>
  );
}

function RightArm({ pose, color }: { pose: MascotPose; color: string }) {
  switch (pose) {
    case "wave":
      return (
        <>
          <Arm d="M136 170 Q156 152 162 128" hand={[163, 122]} color={color} />
          <path d="M174 112 Q180 118 178 126 M180 104 Q188 112 186 124" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </>
      );
    case "cheers":
      return (
        <>
          <Arm d="M136 170 Q158 156 164 132" hand={[164, 128]} color={color} />
          {/* แก้วเบียร์ */}
          <g transform="rotate(12 168 108)">
            <path d="M180 102 Q192 102 192 114 Q192 126 180 126" fill="none" stroke={INK} strokeWidth="4" />
            <rect x="152" y="94" width="30" height="40" rx="5" fill="#FDE68A" {...line} />
            <rect x="157" y="104" width="5" height="24" rx="2.5" fill="#fff" opacity="0.7" />
            <path d="M149 98 Q150 84 160 88 Q166 78 175 86 Q186 82 185 97 Q167 101 149 98 Z" fill="#fff" {...line} />
          </g>
          <circle cx="164" cy="128" r="8" fill={SKIN} {...line} strokeWidth={3} />
        </>
      );
    case "point":
      return (
        <>
          <Arm d="M138 172 Q160 170 176 160" hand={[178, 158]} color={color} />
          <path d="M184 154 L196 147" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M184 154 L196 147" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    default:
      return <Arm d="M136 168 Q152 186 148 206" hand={[147, 208]} color={color} />;
  }
}

function RaBackHair({ c }: { c: Look }) {
  return (
    <>
      {/* มวยผมคู่ */}
      <circle cx="52" cy="50" r="22" fill={c.hair} {...line} />
      <circle cx="148" cy="50" r="22" fill={c.hair} {...line} />
      <path d="M40 46 Q50 40 58 48 M142 48 Q150 40 160 46" fill="none" stroke={c.hairShade} strokeWidth="3" strokeLinecap="round" />
      {/* ผมยาวด้านหลัง */}
      <path d="M44 100 Q38 150 58 166 L142 166 Q162 150 156 100 Z" fill={c.hair} {...line} />
    </>
  );
}

function RaHair({ c }: { c: Look }) {
  return (
    <>
      <path
        d="M41 104 Q38 44 100 40 Q162 44 159 104 Q154 78 136 70 Q128 86 112 78 Q100 90 86 78 Q74 88 64 72 Q48 82 41 104 Z"
        fill={c.hair}
        {...line}
      />
      <path d="M70 56 Q90 46 112 50" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {/* กิ๊บดาว */}
      <path
        d="M138 52 l3.4 7 7.6 1.1 -5.5 5.4 1.3 7.6 -6.8 -3.6 -6.8 3.6 1.3 -7.6 -5.5 -5.4 7.6 -1.1 Z"
        fill="#FACC15"
        {...line}
        strokeWidth={2.5}
      />
    </>
  );
}

function RoengHair({ c }: { c: Look }) {
  return (
    <>
      <path
        d="M40 106 Q34 46 100 38 Q166 46 160 106 Q154 82 144 74 L138 86 L126 68 L114 84 L100 66 L88 84 L76 68 L66 86 Q52 82 40 106 Z"
        fill={c.hair}
        {...line}
      />
      {/* ผมชี้ด้านบน */}
      <path d="M96 40 Q100 16 120 18 Q108 26 112 40" fill={c.hair} {...line} />
      <path d="M66 58 Q86 46 110 48" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.25" />
      {/* พลาสเตอร์ที่แก้ม */}
      <g transform="rotate(-20 138 128)">
        <rect x="128" y="123" width="20" height="9" rx="3" fill="#FDE2C4" stroke={INK} strokeWidth="2" />
        <path d="M136 125 v5 M140 125 v5" stroke={SKIN_SHADE} strokeWidth="1.5" />
      </g>
    </>
  );
}

function Face({ mood }: { mood: MascotMood }) {
  const blush = (
    <>
      <ellipse cx="66" cy="122" rx="10" ry="6" fill="#FF8FAB" opacity="0.55" />
      <ellipse cx="134" cy="122" rx="10" ry="6" fill="#FF8FAB" opacity="0.55" />
    </>
  );
  return (
    <g>
      {blush}
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === "sad" && <path d="M126 118 Q122 128 126 132 Q130 128 126 118 Z" fill="#7DD3FC" stroke={INK} strokeWidth="1.5" />}
      {mood === "sleepy" && (
        <text x="150" y="58" fontSize="20" fontWeight="800" fill="#A79FC4" fontFamily="sans-serif">
          z
          <tspan x="164" y="44" fontSize="14">
            z
          </tspan>
        </text>
      )}
    </g>
  );
}

function OpenEye({ x, sparkle = false }: { x: number; sparkle?: boolean }) {
  return (
    <>
      <ellipse cx={x} cy="104" rx="9.5" ry="12" fill={INK} />
      {sparkle ? (
        <path
          d={`M${x + 3} ${94} l1.6 3.4 3.6 0.5 -2.6 2.5 0.6 3.6 -3.2 -1.7 -3.2 1.7 0.6 -3.6 -2.6 -2.5 3.6 -0.5 Z`}
          fill="#fff"
        />
      ) : (
        <circle cx={x + 3} cy="99" r="3.6" fill="#fff" />
      )}
      <circle cx={x - 3} cy="109" r="1.8" fill="#fff" />
    </>
  );
}

function Eyes({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "excited":
      return (
        <>
          <OpenEye x={78} sparkle />
          <OpenEye x={122} sparkle />
        </>
      );
    case "surprised":
      return (
        <>
          <circle cx="78" cy="104" r="7" fill="#fff" {...line} strokeWidth={3} />
          <circle cx="78" cy="104" r="3" fill={INK} />
          <circle cx="122" cy="104" r="7" fill="#fff" {...line} strokeWidth={3} />
          <circle cx="122" cy="104" r="3" fill={INK} />
          <path d="M68 86 Q76 80 86 84 M114 84 Q124 80 132 86" fill="none" {...line} strokeWidth={3} />
        </>
      );
    case "wink":
      return (
        <>
          <OpenEye x={78} />
          <path d="M112 106 Q122 96 132 106" fill="none" {...line} />
        </>
      );
    case "sleepy":
      return <path d="M68 104 Q78 110 88 104 M112 104 Q122 110 132 104" fill="none" {...line} />;
    case "sad":
      return (
        <>
          <OpenEye x={78} />
          <OpenEye x={122} />
          <path d="M66 88 Q74 84 86 90 M114 90 Q126 84 134 88" fill="none" {...line} strokeWidth={3} />
        </>
      );
    default:
      return (
        <>
          <OpenEye x={78} />
          <OpenEye x={122} />
        </>
      );
  }
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "excited":
      return (
        <>
          <path d="M86 120 Q100 142 114 120 Z" fill="#9F1D4A" {...line} strokeWidth={3} />
          <path d="M93 131 Q100 126 107 131 Q100 137 93 131 Z" fill="#FF7A9C" />
        </>
      );
    case "surprised":
      return <ellipse cx="100" cy="128" rx="6" ry="8" fill="#9F1D4A" {...line} strokeWidth={3} />;
    case "sleepy":
      return <path d="M95 126 Q100 129 105 126" fill="none" {...line} strokeWidth={3} />;
    case "sad":
      return <path d="M90 130 Q100 122 110 130" fill="none" {...line} strokeWidth={3} />;
    case "wink":
      return (
        <>
          <path d="M88 121 Q100 133 112 121" fill="none" {...line} strokeWidth={3} />
          <path d="M104 127 Q108 134 112 128" fill="#FF7A9C" stroke={INK} strokeWidth="2" />
        </>
      );
    default:
      return <path d="M89 121 Q100 132 111 121" fill="none" {...line} strokeWidth={3} />;
  }
}
