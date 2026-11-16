"use client";

import { useRoom } from "@/lib/client/room-store";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

/** ยืนยันก่อนหัวหน้าห้องหยุดเกม แล้วพาทุกคนกลับหน้าแรกของห้อง (เลือกเกม) */
export function BackHomeConfirm({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const room = useRoom();
  const inGame = room.snap.room.stage === "playing";
  return (
    <Modal open={open} onClose={onClose} title="🏠 กลับหน้าแรก?">
      <p className="mb-5 text-lg text-muted">
        {inGame
          ? "เกมที่เล่นอยู่จะหยุดทันที และทุกคนจะกลับไปหน้าเลือกเกม (คะแนน/ความคืบหน้าของเกมนี้จะหายไป)"
          : "ทุกคนจะกลับไปหน้าเลือกเกม"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button tone="ghost" size="lg" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          tone="coral"
          size="lg"
          onClick={async () => {
            const ok = await room.dispatch("hub.backToLobby");
            if (ok) {
              onClose();
              onDone?.();
            }
          }}
        >
          กลับหน้าแรก
        </Button>
      </div>
    </Modal>
  );
}
