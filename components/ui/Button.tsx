"use client";

import { motion, type HTMLMotionProps } from "motion/react";

export type Tone = "violet" | "pink" | "sun" | "mint" | "coral" | "sky" | "ghost" | "white";
type Size = "sm" | "md" | "lg" | "xl";

const TONES: Record<Tone, string> = {
  // ปุ่มหลัก: ฟ้าไซเบอร์ / เขียวมิ้นต์นีออน ตัดตัวอักษรสีเข้ม
  violet: "glow-sky border-sky/40 bg-gradient-to-b from-[#5cc8fa] to-sky text-ink",
  pink: "glow-mint border-emerald-300/40 bg-gradient-to-b from-[#2fd39f] to-mint text-ink",
  sun: "border-amber-200/40 bg-gradient-to-b from-[#f7d978] to-sun text-ink",
  mint: "glow-mint border-emerald-300/40 bg-gradient-to-b from-[#2fd39f] to-mint text-ink",
  // ปุ่มอันตราย: แดงคอรัลนุ่มๆ โปร่งแสง
  coral: "border-rose-500/30 bg-rose-500/20 text-rose-400 backdrop-blur-xl hover:bg-rose-500/30",
  sky: "glow-sky border-sky/40 bg-gradient-to-b from-[#5cc8fa] to-sky text-ink",
  ghost: "border-white/10 bg-white/5 text-white backdrop-blur-xl hover:bg-white/10",
  white: "border-white/60 bg-white/90 text-ink",
};

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm rounded-xl gap-1.5",
  md: "px-5 py-3 text-base rounded-2xl gap-2",
  lg: "px-6 py-4 text-lg rounded-2xl gap-2",
  xl: "px-7 py-5 text-2xl rounded-3xl gap-3",
};

export function Button({
  tone = "mint",
  size = "md",
  className = "",
  children,
  ...rest
}: HTMLMotionProps<"button"> & { tone?: Tone; size?: Size }) {
  return (
    <motion.button
      type="button"
      whileHover={rest.disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      className={`btn-3d inline-flex select-none items-center justify-center font-bold tracking-tight ${TONES[tone]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  className = "",
  children,
  label,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`btn-3d inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-white/10 bg-white/5 text-white/90 backdrop-blur-xl hover:bg-white/10 hover:text-white ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
