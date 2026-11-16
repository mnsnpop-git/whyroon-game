"use client";

import { Check, ChevronLeft, Copy, Crown, House, LogOut, QrCode, Settings, Trash2, UserPen } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { useToast } from "@/lib/client/toast";
import { Avatar } from "../ui/Avatar";
import { Button, IconButton } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { roomLink } from "./Lobby";
import { ProfileEditor } from "./ProfileEditor";

type Panel = "menu" | "profile" | "qr" | "transfer" | "home" | "leave" | "delete";

/** ปุ่ม ⚙️ ตั้งค่าห้อง — ใช้ได้ทุกหน้าจอ (header และหน้าจอเต็มจอ เช่น คนใบ้คำ) */
export function RoomSettingsButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label="ตั้งค่าห้อง" onClick={() => setOpen(true)} className={`h-9 w-9 ${className}`}>
        <Settings size={18} />
      </IconButton>
      <RoomSettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function RoomSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const room = useRoom();
  const [panel, setPanel] = useState<Panel>("menu");
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const inLobby = room.snap.room.stage === "lobby" || !room.snap.room.game;
  const inGame = room.snap.room.stage === "playing";
  const others = room.players.filter((p) => p.id !== room.me);

  const close = () => {
    onClose();
    // รอ animation ปิดก่อนค่อยรีเซ็ต
    setTimeout(() => {
      setPanel("menu");
      setTarget(null);
    }, 250);
  };
  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    return ok;
  };

  const titles: Record<Panel, string> = {
    menu: "⚙️ ตั้งค่าห้อง",
    profile: "🙂 แก้ไขโปรไฟล์",
    qr: "📱 สแกนเพื่อเข้าห้อง",
    transfer: "👑 เปลี่ยนหัวหน้าห้อง",
    home: "🏠 กลับหน้าหลัก?",
    leave: "🚪 ออกจากห้อง?",
    delete: "🗑️ ลบห้อง?",
  };

  const back = (
    <Button tone="ghost" size="lg" disabled={busy} onClick={() => setPanel("menu")}>
      <ChevronLeft size={20} /> ย้อนกลับ
    </Button>
  );

  let body: React.ReactNode;
  if (panel === "menu") {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-sun/20 bg-sun/[0.07] p-3">
          <Avatar player={room.host} host />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-sun">หัวหน้าห้องตอนนี้</div>
            <div className="truncate text-lg font-bold">
              {room.host?.nickname ?? "-"}
              {room.isHost && <span className="ml-1 text-sm font-medium text-sky">(คุณ)</span>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPanel("profile")}
          className="btn-3d flex items-center gap-3 rounded-2xl border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
        >
          <Avatar player={room.player(room.me)} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-muted">โปรไฟล์ของคุณ</span>
            <span className="block truncate text-lg font-bold">{room.player(room.me)?.nickname}</span>
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-sky">
            <UserPen size={18} /> แก้ไข
          </span>
        </button>

        <Button tone="sky" size="lg" className="justify-start" onClick={() => setPanel("qr")}>
          <QrCode size={20} /> QR Code / ลิงก์ชวนเพื่อนเข้าห้อง
        </Button>

        {room.isHost && (
          <>
            <Button tone="ghost" size="lg" className="justify-start" onClick={() => setPanel("transfer")}>
              <Crown size={20} className="text-sun" /> เปลี่ยนหัวหน้าห้อง
            </Button>
            <Button
              tone="ghost"
              size="lg"
              className="justify-start"
              disabled={inLobby}
              onClick={() => setPanel("home")}
            >
              <House size={20} className="text-sky" /> กลับหน้าหลัก (เลือกเกม)
              {inLobby && <span className="ml-auto text-xs font-medium text-muted">อยู่หน้าหลักแล้ว</span>}
            </Button>
          </>
        )}
        <Button tone="ghost" size="lg" className="justify-start" onClick={() => setPanel("leave")}>
          <LogOut size={20} className="text-muted" /> ออกจากห้อง (ออกจากระบบ)
        </Button>
        {room.isHost && (
          <Button tone="coral" size="lg" className="justify-start" onClick={() => setPanel("delete")}>
            <Trash2 size={20} /> ลบห้อง
          </Button>
        )}
      </div>
    );
  } else if (panel === "profile") {
    body = <ProfileEditor back={back} onDone={() => setPanel("menu")} />;
  } else if (panel === "qr") {
    const link = roomLink(room.code);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        // fallback สำหรับเบราว์เซอร์ที่ไม่อนุญาต clipboard
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      toast("คัดลอกลิงก์แล้ว ส่งให้เพื่อนเลย!", "success");
      setTimeout(() => setCopied(false), 2000);
    };
    body = (
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-3xl bg-white p-4 shadow-[0_0_40px_-8px_rgba(56,189,248,0.45)] ring-1 ring-sky/30">
          <QRCodeSVG value={link} size={220} level="M" marginSize={0} />
        </div>
        <p className="text-gradient text-5xl font-extrabold tracking-[0.2em]">{room.code}</p>
        <p className="break-all text-center text-sm text-muted">{link}</p>
        <div className="grid w-full grid-cols-2 gap-3">
          {back}
          <Button tone="sky" size="lg" onClick={copy}>
            {copied ? <Check size={20} /> : <Copy size={20} />} คัดลอกลิงก์
          </Button>
        </div>
      </div>
    );
  } else if (panel === "transfer") {
    body = (
      <div className="flex flex-col gap-3">
        {others.length === 0 ? (
          <p className="rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-center text-muted">
            ยังไม่มีผู้เล่นคนอื่นในห้อง
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">เลือกคนที่จะเป็นหัวหน้าห้องคนใหม่</p>
            <ul className="flex max-h-[45dvh] flex-col gap-2 overflow-y-auto">
              {others.map((p) => {
                const offline = room.online.size > 0 && !room.online.has(p.id);
                const active = target === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setTarget(p.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        active
                          ? "border-sun/50 bg-sun/10"
                          : "border-white/5 bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.08]"
                      }`}
                    >
                      <Avatar player={p} size="sm" dim={offline} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{p.nickname}</span>
                      <span className={`text-xs ${offline ? "text-coral" : "text-mint"}`}>
                        ● {offline ? "ออฟไลน์" : "ออนไลน์"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          {back}
          <Button
            tone="sun"
            size="lg"
            disabled={!target || busy}
            onClick={async () => {
              if (await run(() => room.dispatch("room.transferHost", { playerId: target }))) close();
            }}
          >
            <Crown size={20} /> โอนสิทธิ์
          </Button>
        </div>
      </div>
    );
  } else if (panel === "home") {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-lg text-muted">
          {inGame
            ? "เกมที่เล่นอยู่จะหยุดทันที และทุกคนจะกลับไปหน้าเลือกเกม (ความคืบหน้าของเกมนี้จะหายไป)"
            : "ทุกคนจะกลับไปหน้าเลือกเกม"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {back}
          <Button
            tone="sky"
            size="lg"
            disabled={busy}
            onClick={async () => {
              if (await run(() => room.dispatch("hub.backToLobby"))) close();
            }}
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  } else if (panel === "leave") {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-lg text-muted">
          {room.isHost
            ? "สิทธิ์หัวหน้าห้องจะถูกโอนให้คนถัดไปอัตโนมัติ คุณกลับเข้ามาใหม่ได้ด้วยรหัสห้องเดิม"
            : "คุณสามารถกลับเข้ามาใหม่ได้ด้วยรหัสห้องเดิม"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {back}
          <Button
            tone="coral"
            size="lg"
            disabled={busy}
            onClick={async () => {
              if (await run(() => room.dispatch("room.leave"))) room.exit();
            }}
          >
            ออกเลย
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-lg text-muted">
          ห้อง <b className="text-white">{room.code}</b> จะถูกลบถาวร ผู้เล่นทุกคนจะถูกพากลับหน้าแรก
          และข้อมูลเกมทั้งหมดจะหายไป <b className="text-rose-300">ย้อนกลับไม่ได้</b>
        </p>
        <div className="grid grid-cols-2 gap-3">
          {back}
          <Button
            tone="coral"
            size="lg"
            disabled={busy}
            onClick={async () => {
              if (await run(() => room.dispatch("room.delete"))) room.exit(`ลบห้อง ${room.code} แล้ว`);
            }}
          >
            <Trash2 size={20} /> ลบถาวร
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Modal open={open} onClose={close} title={titles[panel]}>
      {body}
    </Modal>
  );
}
