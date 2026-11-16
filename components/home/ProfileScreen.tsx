"use client";

import { motion } from "motion/react";
import { ArrowLeft, Dices } from "lucide-react";
import { useState } from "react";
import { EMOJIS } from "@/lib/constants";
import type { SavedProfile } from "@/lib/client/storage";
import { Button, IconButton } from "../ui/Button";
import { EmojiPicker } from "../ui/EmojiPicker";

const FUNNY_NAMES = [
  "คอทองแดง", "สายแข็ง", "เมาแล้วเต้น", "ขี้แพ้ชวนตี", "ตัวตึง",
  "สายชิล", "จอมแกง", "หมีขาว", "พี่ใหญ่", "น้องเล็ก",
];

export function ProfileScreen({
  mode,
  code,
  initial,
  busy,
  onBack,
  onSubmit,
}: {
  mode: "create" | "join";
  code?: string;
  initial: SavedProfile | null;
  busy: boolean;
  onBack: () => void;
  onSubmit: (p: SavedProfile) => void;
}) {
  const [emoji, setEmoji] = useState(() => initial?.emoji ?? EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const valid = nickname.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-5">
      <div className="mb-5 flex items-center gap-3">
        <IconButton label="ย้อนกลับ" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
        <h1 className="text-2xl font-extrabold">
          {mode === "create" ? "สร้างห้องใหม่" : `เข้าห้อง ${code}`}
        </h1>
      </div>

      <div className="mb-5 flex flex-col items-center">
        <motion.div
          key={emoji}
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className="card-3d flex h-28 w-28 items-center justify-center rounded-3xl bg-panel text-7xl"
        >
          {emoji}
        </motion.div>
        <p className="mt-2 text-muted">เลือกอิโมจิประจำตัว</p>
      </div>

      <EmojiPicker value={emoji} onChange={setEmoji} className="card-3d mb-5 rounded-3xl bg-panel p-3" />

      <form
        className="flex flex-1 flex-col"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (valid && !busy) onSubmit({ emoji, nickname: nickname.trim(), avatar: initial?.avatar ?? null });
        }}
      >
        <label className="mb-2 block text-lg font-bold" htmlFor="nickname">
          ชื่อเล่นของคุณ
        </label>
        <div className="flex gap-2">
          <input
            id="nickname"
            value={nickname}
            maxLength={20}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="เช่น ต้น, ปุ๊กกี้, คอทองแดง"
            autoComplete="nickname"
            className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-xl font-semibold border border-white/15 bg-black/30 text-white placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
          />
          <IconButton
            label="สุ่มชื่อ"
            className="h-auto w-14 bg-sun text-ink"
            onClick={() => setNickname(FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)])}
          >
            <Dices />
          </IconButton>
        </div>

        <div className="mt-auto pt-8">
          <Button type="submit" tone="mint" size="xl" className="w-full" disabled={!valid || busy}>
            {busy ? "กำลังเข้า..." : mode === "create" ? "สร้างห้องเลย! 🚀" : "เข้าห้องเลย! 🎉"}
          </Button>
        </div>
      </form>
    </main>
  );
}
