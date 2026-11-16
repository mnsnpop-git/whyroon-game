"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { BackHomeConfirm } from "./BackHome";

export interface MenuAction {
  label: React.ReactNode;
  tone?: "violet" | "pink" | "sun" | "mint" | "coral" | "ghost";
  onClick: () => void | Promise<unknown>;
}

/** เมนูหัวหน้าห้องระหว่างเล่น */
export function HostMenu({ actions = [] }: { actions?: MenuAction[] }) {
  const room = useRoom();
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  if (!room.isHost) return null;
  return (
    <>
      <Button tone="ghost" size="sm" onClick={() => setOpen(true)}>
        <Settings2 size={16} /> เมนู
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="เมนูหัวหน้าห้อง 👑">
        <div className="flex flex-col gap-3">
          {actions.map((a, i) => (
            <Button
              key={i}
              tone={a.tone ?? "ghost"}
              size="lg"
              onClick={async () => {
                await a.onClick();
                setOpen(false);
              }}
            >
              {a.label}
            </Button>
          ))}
          {confirmEnd ? (
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-coral/15 p-2">
              <Button tone="ghost" onClick={() => setConfirmEnd(false)}>
                ยกเลิก
              </Button>
              <Button
                tone="coral"
                onClick={async () => {
                  await room.dispatch("game.end");
                  setOpen(false);
                  setConfirmEnd(false);
                }}
              >
                จบเลย
              </Button>
            </div>
          ) : (
            <Button tone="coral" size="lg" onClick={() => setConfirmEnd(true)}>
              🛑 จบเกม กลับไปหน้าตั้งค่า
            </Button>
          )}
          <Button tone="coral" size="lg" onClick={() => setConfirmHome(true)}>
            🏠 หยุดเกม กลับหน้าแรก
          </Button>
        </div>
      </Modal>
      <BackHomeConfirm open={confirmHome} onClose={() => setConfirmHome(false)} onDone={() => setOpen(false)} />
    </>
  );
}
