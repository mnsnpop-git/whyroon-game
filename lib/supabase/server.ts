import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์");
  }
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** ส่งสัญญาณ "sync" ผ่าน Realtime Broadcast (REST) ให้ทุกเครื่องในห้องดึงสถานะใหม่ทันที */
export async function broadcastSync(code: string, version: number) {
  const supabase = getAdmin();
  const channel = supabase.channel(`room:${code}`);
  try {
    await channel.httpSend("sync", { version }, { timeout: 3000 });
  } catch {
    // ไม่เป็นไร — client ยังมี postgres_changes และ polling สำรอง
  } finally {
    await supabase.removeChannel(channel);
  }
}
