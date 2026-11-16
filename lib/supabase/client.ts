"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

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
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "raraeng-auth" },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

/** เข้าสู่ระบบแบบไม่ระบุตัวตน (Anonymous) — เรียกซ้ำได้ ใช้ session เดิมถ้ามี */
export async function ensureSession(): Promise<{ userId: string; token: string }> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return { userId: data.session.user.id, token: data.session.access_token };
  }
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.session) {
    throw new Error(
      "เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบว่าเปิด Anonymous Sign-ins ใน Supabase แล้ว (" +
        (error?.message ?? "no session") +
        ")",
    );
  }
  return { userId: signed.session.user.id, token: signed.session.access_token };
}
