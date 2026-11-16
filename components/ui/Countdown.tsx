"use client";

import { useEffect, useRef, useState } from "react";
import { serverNow } from "@/lib/client/api";

/** คืนค่ามิลลิวินาทีที่เหลือจนถึง deadline (อิงนาฬิกาเซิร์ฟเวอร์) อัปเดตทุก ~200ms */
export function useRemaining(deadline: number | null | undefined, interval = 200) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!deadline) return;
    // deadline เปลี่ยน (เช่น เล่นต่อหลังหยุดเกม) → อัปเดตเวลาทันที ไม่ต้องรอรอบถัดไป
    const first = setTimeout(() => setNow(serverNow()), 0);
    const id = setInterval(() => setNow(serverNow()), interval);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [deadline, interval]);
  if (!deadline) return 0;
  return Math.max(0, deadline - now);
}

export function formatTime(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** เรียก fn ครั้งเดียวเมื่อถึง deadline + delay (ใช้ให้ client ช่วยขยับเฟสเกม) */
export function useDeadline(
  deadline: number | null | undefined,
  key: string,
  fn: () => void,
  delayMs = 0,
) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (!deadline) return;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      fnRef.current();
    };
    const wait = deadline + delayMs - serverNow();
    const t = setTimeout(fire, Math.max(0, wait));
    // ถ้ายังค้างอยู่ (เช่น request ล้มเหลว) ลองซ้ำทุก 4 วินาที
    const retry = setInterval(() => {
      if (serverNow() > deadline + delayMs + 3000) {
        fired = false;
        fire();
      }
    }, 4000);
    return () => {
      clearTimeout(t);
      clearInterval(retry);
    };
  }, [deadline, key, delayMs]);
}

export function TimerPill({
  deadline,
  warnAt = 10_000,
  className = "",
}: {
  deadline: number | null | undefined;
  warnAt?: number;
  className?: string;
}) {
  const ms = useRemaining(deadline);
  const warn = ms > 0 && ms <= warnAt;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1 font-bold tabular-nums backdrop-blur-xl ${
        warn ? "animate-pulse border-rose-500/40 bg-rose-500/20 text-rose-300" : "border-white/10 bg-white/5 text-white"
      } ${className}`}
    >
      ⏱️ {formatTime(ms)}
    </span>
  );
}
