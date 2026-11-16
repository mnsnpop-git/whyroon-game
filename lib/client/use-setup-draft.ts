"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameSetup } from "../types";
import { useRoom } from "./room-store";

/**
 * สำเนา setup ฝั่งหัวหน้าห้อง: แก้ได้ทันทีบนจอ แล้วค่อยส่งขึ้นเซิร์ฟเวอร์แบบ debounce
 * ถ้าไม่ได้แก้ค้างอยู่ จะซิงค์ตามค่าบนเซิร์ฟเวอร์ (เช่นมีคนเข้าห้องเพิ่ม)
 */
export function useSetupDraft<K extends keyof GameSetup>(game: K) {
  const room = useRoom();
  const server = room.setup[game];
  const serverKey = JSON.stringify(server);
  const version = room.snap.room.version;

  const [draft, setDraft] = useState<GameSetup[K]>(server);
  const [base, setBase] = useState(serverKey);
  const [typing, setTyping] = useState(false);
  const [waitVersion, setWaitVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<GameSetup[K]>(server);

  // ซิงค์จากเซิร์ฟเวอร์ (ปรับ state ระหว่าง render ตามแนวทางของ React)
  if (!typing && version >= waitVersion && serverKey !== base) {
    setBase(serverKey);
    setDraft(server);
  }

  const send = useCallback(
    async (next: GameSetup[K]) => {
      const res = await room.dispatchRaw("setup.update", { game, setup: next });
      const v = res.data?.version;
      if (typeof v === "number") setWaitVersion(v);
      setTyping(false);
    },
    [room, game],
  );

  const update = useCallback(
    (next: GameSetup[K]) => {
      latest.current = next;
      setDraft(next);
      setTyping(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void send(latest.current);
      }, 400);
    },
    [send],
  );

  /** ส่งค่าที่ค้างอยู่ทันที (เช่นก่อนกดเริ่มเกม) */
  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      await send(latest.current);
    }
  }, [send]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { draft, update, flush };
}
