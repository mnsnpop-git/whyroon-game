"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { EMOJIS } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import { loadProfile, saveProfile } from "@/lib/client/storage";
import { useToast } from "@/lib/client/toast";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmojiPicker } from "../ui/EmojiPicker";

const AVATAR_PX = 128;
const AVATAR_MAX_CHARS = 20_000; // ต้องตรงกับฝั่งเซิร์ฟเวอร์ (lib/engine)
const FILE_MAX_BYTES = 15 * 1024 * 1024;

/** ย่อรูปเป็นสี่เหลี่ยมจัตุรัส 128px (crop กลางภาพ) แล้วบีบเป็น JPEG ให้เล็กพอส่งผ่าน realtime */
async function resizeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  if (file.size > FILE_MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 15MB");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("เปิดรูปนี้ไม่ได้ (ลองใช้ JPG หรือ PNG)"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("รูปนี้ไม่มีขนาด");
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    const g = canvas.getContext("2d");
    if (!g) throw new Error("เบราว์เซอร์ไม่รองรับการย่อรูป");
    g.fillStyle = "#0e1422"; // พื้นหลังสำหรับรูปโปร่งใส
    g.fillRect(0, 0, AVATAR_PX, AVATAR_PX);
    g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    for (const q of [0.82, 0.7, 0.55, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length <= AVATAR_MAX_CHARS) return data;
    }
    throw new Error("รูปนี้ย่อแล้วยังใหญ่เกินไป ลองรูปอื่นนะ");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** แก้ไขโปรไฟล์ในห้อง: ชื่อ + emoji หรือรูปจากเครื่อง — กดบันทึกแล้วทุกคนเห็นทันที */
export function ProfileEditor({ onDone, back }: { onDone: () => void; back: React.ReactNode }) {
  const room = useRoom();
  const toast = useToast();
  const me = room.player(room.me);
  const [nickname, setNickname] = useState(me?.nickname ?? "");
  const [emoji, setEmoji] = useState(me?.emoji ?? EMOJIS[0]);
  const [avatar, setAvatar] = useState<string | null>(me?.avatar ?? null);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const name = nickname.replace(/\s+/g, " ").trim();
  const changed =
    name !== me?.nickname || emoji !== me?.emoji || (avatar ?? null) !== (me?.avatar ?? null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    setProcessing(true);
    try {
      setAvatar(await resizeImage(file));
    } catch (err) {
      toast(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ", "error");
    } finally {
      setProcessing(false);
    }
  }

  async function save() {
    if (!name || busy) return;
    setBusy(true);
    const ok = await room.dispatch("room.updateProfile", { nickname: name, emoji, avatar });
    setBusy(false);
    if (!ok) return;
    // จำไว้ใช้ตอนเข้าห้องครั้งต่อไป
    saveProfile({ ...(loadProfile() ?? {}), nickname: name, emoji, avatar });
    toast("อัปเดตโปรไฟล์แล้ว ทุกคนในห้องเห็นทันที ✨", "success");
    onDone();
  }

  const preview = me ? { ...me, nickname: name || me.nickname, emoji, avatar } : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar player={preview} size="xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Button tone="sky" size="md" disabled={processing} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={18} /> {processing ? "กำลังย่อรูป..." : avatar ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
          </Button>
          {avatar && (
            <Button tone="coral" size="md" onClick={() => setAvatar(null)}>
              <Trash2 size={18} /> ใช้ Emoji แทน
            </Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">ชื่อเล่น</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          maxLength={20}
          placeholder="ชื่อเล่นของคุณ"
          className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-lg font-bold text-white placeholder:text-white/30 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20"
        />
      </label>

      <div>
        <div className="mb-2 text-sm font-semibold text-muted">
          Emoji {avatar && <span className="text-xs">(ใช้แสดงในรายการเล็กๆ และเมื่อลบรูป)</span>}
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {back}
        <Button tone="mint" size="lg" disabled={!name || !changed || busy || processing} onClick={save}>
          {busy ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
