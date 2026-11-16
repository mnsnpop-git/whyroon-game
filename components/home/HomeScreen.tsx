"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, DoorOpen, PartyPopper, QrCode } from "lucide-react";
import { useRef, useState } from "react";
import { GAMES } from "@/lib/constants";
import { Button } from "../ui/Button";
import { HomeMascots } from "./HomeMascots";

export function HomeScreen({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const valid = /^[A-Z]{4}$/.test(code);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12 pt-12">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-center"
      >
        <HomeMascots />
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
          <span className="text-white">เกมร่าเริง</span>
        </h1>
        <p className="text-gradient mt-1 text-2xl font-extrabold tracking-tight">ปาร์ตี้เกม</p>
        <p className="mt-3 text-lg text-muted">รวมเกมวงเหล้า วงเพื่อน เล่นพร้อมกันบนมือถือ</p>
      </motion.header>

      <div className="flex flex-col gap-5">
        <motion.button
          type="button"
          onClick={onCreate}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="btn-3d card-3d group relative overflow-hidden rounded-3xl border-emerald-400/25 bg-gradient-to-br from-emerald-400/[0.14] via-white/[0.04] to-white/[0.02] p-7 text-left"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/25 blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-60" />
          <PartyPopper className="absolute -right-3 -top-3 text-mint opacity-15 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105" size={120} />
          <div className="text-4xl">🏠</div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight">สร้างห้องใหม่</div>
          <div className="mt-1 text-lg text-white/60">เป็นหัวหน้าห้อง แล้วชวนเพื่อนเข้ามา</div>
        </motion.button>

        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="card-3d group relative overflow-hidden rounded-3xl border-sky/25 bg-gradient-to-br from-sky/[0.14] via-white/[0.04] to-white/[0.02] p-7 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-sky/40"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky/25 opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
          <DoorOpen className="absolute -right-3 -top-3 text-sky opacity-15 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" size={120} />
          <button
            type="button"
            className="w-full text-left"
            onClick={() => {
              setJoining(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <div className="text-4xl">🚪</div>
            <div className="mt-3 text-3xl font-extrabold tracking-tight">เข้าร่วมห้อง</div>
            <div className="mt-1 text-lg text-white/60">กรอกรหัสห้อง 4 ตัว หรือสแกน QR</div>
          </button>
          <AnimatePresence>
            {joining && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) onJoin(code);
                }}
              >
                <div className="mt-4 flex gap-2">
                  <input
                    ref={inputRef}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))
                    }
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="ABCD"
                    aria-label="รหัสห้อง"
                    className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-center text-3xl font-extrabold tracking-[0.4em] text-white placeholder:text-white/20 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
                  />
                  <Button type="submit" tone="sky" size="lg" disabled={!valid} aria-label="เข้าห้อง">
                    <ArrowRight size={28} />
                  </Button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-white/55">
                  <QrCode size={16} /> สแกน QR จากมือถือเพื่อน จะเข้าห้องให้อัตโนมัติ
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <h2 className="mb-4 mt-12 text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted">เกมในปาร์ตี้นี้</h2>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className="card-3d rounded-2xl bg-panel p-4 text-center transition-colors duration-300 hover:bg-white/[0.08]"
          >
            <div className="text-3xl">{g.emoji}</div>
            <div className="mt-1 text-sm font-bold leading-tight" style={{ color: g.color }}>
              {g.title}
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-muted/70">
        ไม่ต้องสมัครสมาชิก · ดื่มอย่างรับผิดชอบ 🍻 · เมาไม่ขับ
      </p>
      <footer className="mt-3 text-center text-xs text-white/35">
        © 2026 Bobby Girl
      </footer>
    </main>
  );
}
