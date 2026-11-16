"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * ที่เก็บ session: จำในหน่วยความจำก่อน แล้วค่อยเขียนลง localStorage (ถ้าเขียนได้)
 * บางเบราว์เซอร์ (เช่น in-app browser ของ LINE/Facebook, โหมดส่วนตัว) เขียน localStorage ไม่ได้
 * ถ้าไม่มีหน่วยความจำสำรอง ทุกครั้งที่ขอ session จะได้ค่าว่าง แล้วระบบจะสร้างบัญชีใหม่เรื่อยๆ
 */
const memory = new Map<string, string>();
const safeStorage = {
  getItem(key: string) {
    if (memory.has(key)) return memory.get(key)!;
    try {
      const v = window.localStorage.getItem(key);
      if (v !== null) memory.set(key, v);
      return v;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* เขียนไม่ได้ก็ใช้หน่วยความจำต่อ */
    }
  },
  removeItem(key: string) {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ในไฟล์ .env.local",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "raraeng-auth", storage: safeStorage },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

let pending: Promise<{ userId: string; token: string }> | null = null;

/**
 * เข้าสู่ระบบแบบไม่ระบุตัวตน (Anonymous) — เรียกซ้ำได้ ใช้ session เดิมถ้ามี
 * เรียกพร้อมกันหลายที่ จะรอผลจากการเข้าสู่ระบบครั้งเดียวกัน (ไม่สร้างหลายบัญชี)
 */
export function ensureSession(): Promise<{ userId: string; token: string }> {
  if (pending) return pending;
  pending = (async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) return fromSession(data.session);
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error || !signed.session) {
      throw new Error(
        "เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบว่าเปิด Anonymous Sign-ins ใน Supabase แล้ว (" +
          (error?.message ?? "no session") +
          ")",
      );
    }
    return fromSession(signed.session);
  })().finally(() => {
    pending = null;
  });
  return pending;
}

function fromSession(s: Session) {
  return { userId: s.user.id, token: s.access_token };
}
