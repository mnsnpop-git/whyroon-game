"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Mascot, type MascotMood, type MascotWho } from "../characters/Mascot";

const TAP_MOODS: MascotMood[] = ["wink", "surprised", "excited", "happy"];

/** โลโก้หน้าแรก: น้องร่า & น้องเริง ชนแก้ว ขยับดุ๊กดิ๊ก แตะแล้วกระโดด */
export function HomeMascots() {
  const reduce = useReducedMotion();
  const [taps, setTaps] = useState(0);
  const mood = taps === 0 ? "excited" : TAP_MOODS[(taps - 1) % TAP_MOODS.length];

  return (
    <button
      type="button"
      aria-label="น้องร่า และน้องเริง ตัวละครประจำ Whyroon (แตะเพื่อเล่นด้วย)"
      onClick={() => {
        setTaps((n) => n + 1);
        navigator.vibrate?.(20);
      }}
      className="relative mx-auto mb-1 flex h-48 items-end justify-center outline-none focus-visible:ring-4 focus-visible:ring-sky/30 rounded-3xl"
    >
      {/* แสงฟุ้งด้านหลัง */}
      <span className="pointer-events-none absolute inset-x-6 bottom-4 top-10 rounded-full bg-gradient-to-r from-pink-400/25 via-sun/15 to-sky/25 blur-2xl" />
      <Buddy who="ra" mood={mood} taps={taps} reduce={!!reduce} delay={0} tilt={-4} />
      <Buddy who="roeng" mood={mood} taps={taps} reduce={!!reduce} delay={0.35} tilt={4} />
      {/* ประกายตอนแตะ */}
      {taps > 0 && !reduce && (
        <motion.span
          key={taps}
          initial={{ opacity: 1, scale: 0.4, y: 0 }}
          animate={{ opacity: 0, scale: 1.4, y: -30 }}
          transition={{ duration: 0.7 }}
          className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-3xl"
        >
          ✨
        </motion.span>
      )}
    </button>
  );
}

function Buddy({
  who,
  mood,
  taps,
  reduce,
  delay,
  tilt,
}: {
  who: MascotWho;
  mood: MascotMood;
  taps: number;
  reduce: boolean;
  delay: number;
  tilt: number;
}) {
  return (
    <motion.div
      initial={reduce ? false : { y: 40, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 14, delay: delay * 0.6 }}
      className={who === "ra" ? "-mr-5" : "-ml-5"}
    >
      {/* กระโดดเมื่อแตะ */}
      <motion.div
        key={taps}
        animate={reduce || taps === 0 ? undefined : { y: [0, -26, 0, -8, 0], rotate: [0, tilt * 2, 0] }}
        transition={{ duration: 0.65, delay: delay * 0.3, ease: "easeOut" }}
      >
        {/* ดุ๊กดิ๊กตลอดเวลา (สลับจังหวะกันสองตัว) */}
        <motion.div
          animate={reduce ? undefined : { y: [0, -6, 0], rotate: [tilt * -0.5, tilt, tilt * -0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay }}
          style={{ transformOrigin: "50% 90%" }}
        >
          {/* เริงหันกลับด้าน ให้แก้วสองใบมาชนกันตรงกลาง */}
          <Mascot
            who={who}
            mood={mood}
            pose="cheers"
            className={`h-44 w-auto drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)] ${who === "roeng" ? "-scale-x-100" : ""}`}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
