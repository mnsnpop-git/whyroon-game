"use client";

import { ensureSession } from "../supabase/client";
import type { ActionResponse } from "../types";

// ---------- นาฬิกาที่ซิงค์กับเซิร์ฟเวอร์ ----------
let offset = 0;
let bestRtt = Number.POSITIVE_INFINITY;
let bestAt = 0;

function sample(serverNow: number, t0: number, t1: number) {
  const rtt = t1 - t0;
  // ใช้ตัวอย่างที่ RTT ต่ำสุด และรีเฟรชทุก 60 วินาที
  if (rtt <= bestRtt || t1 - bestAt > 60_000) {
    bestRtt = rtt;
    bestAt = t1;
    offset = serverNow - (t0 + rtt / 2);
  }
}

/** เวลาปัจจุบันตามนาฬิกาเซิร์ฟเวอร์ (ms) */
export function serverNow() {
  return Date.now() + offset;
}

export async function syncClock() {
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "time" }),
        cache: "no-store",
      });
      const data = (await res.json()) as ActionResponse;
      sample(data.serverNow, t0, Date.now());
    } catch {
      /* ignore */
    }
  }
}

export async function callAction(
  type: string,
  code?: string,
  payload?: Record<string, unknown>,
): Promise<ActionResponse> {
  const { token } = await ensureSession();
  const t0 = Date.now();
  try {
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, code, payload }),
      cache: "no-store",
    });
    const data = (await res.json()) as ActionResponse;
    if (typeof data.serverNow === "number") sample(data.serverNow, t0, Date.now());
    return data;
  } catch {
    return { ok: false, error: "เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่", serverNow: serverNow() };
  }
}
