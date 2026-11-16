"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { callAction } from "@/lib/client/api";
import type { SavedProfile } from "@/lib/client/storage";
import { Button } from "../ui/Button";

const RETRY_MS = 3000;

/** รอเข้าห้องระหว่างที่เกมกำลังเล่นกลางตา — ลองเข้าใหม่อัตโนมัติจนกว่าจะจบตา */
export function WaitingScreen({
  code,
  profile,
  waitKey,
  reason,
  onJoined,
  onFail,
  onCancel,
}: {
  code: string;
  profile: SavedProfile;
  waitKey: string;
  reason: string;
  onJoined: () => void;
  onFail: (message: string) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(reason);
  const cbs = useRef({ onJoined, onFail });
  useEffect(() => {
    cbs.current = { onJoined, onFail };
  });

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      // ส่ง waitKey เดิม (ตาที่เห็นตอนเริ่มรอ) เพื่อให้เซิร์ฟเวอร์รู้ว่าจบตานั้นแล้วหรือยัง
      const res = await callAction("room.join", code, { ...profile, waitKey });
      if (stop) return;
      if (res.ok) return cbs.current.onJoined();
      if (res.data?.wait) {
        if (res.error) setMessage(res.error);
        timer = setTimeout(tick, RETRY_MS);
        return;
      }
      cbs.current.onFail(res.error ?? "เข้าห้องไม่สำเร็จ");
    };
    timer = setTimeout(tick, RETRY_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [code, profile, waitKey]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div
        animate={{ rotate: [0, -12, 12, 0] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="text-7xl"
      >
        ⏳
      </motion.div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">ห้อง</p>
        <p className="text-gradient text-5xl font-extrabold tracking-[0.2em]">{code}</p>
      </div>
      <section className="card-3d w-full rounded-3xl bg-panel p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">รอเข้าห้องสักครู่</h1>
        <p className="mt-2 text-lg text-white/80">{message}</p>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
          </span>
          จบตาเมื่อไหร่ จะพาเข้าห้องให้อัตโนมัติ
        </p>
      </section>
      <p className="text-sm text-muted">
        เข้าห้องในชื่อ <b className="text-white">{profile.emoji} {profile.nickname}</b>
      </p>
      <Button tone="ghost" size="lg" className="w-full" onClick={onCancel}>
        ยกเลิก กลับหน้าแรก
      </Button>
    </main>
  );
}
