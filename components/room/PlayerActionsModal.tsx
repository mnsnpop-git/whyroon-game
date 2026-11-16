"use client";

import { Crown, UserX } from "lucide-react";
import { useRoom } from "@/lib/client/room-store";
import type { Player } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function PlayerActionsModal({
  player,
  onClose,
}: {
  player: Player | null;
  onClose: () => void;
}) {
  const room = useRoom();
  const offline = player && room.online.size > 0 && !room.online.has(player.id);
  return (
    <Modal open={!!player} onClose={onClose} title="จัดการผู้เล่น">
      {player && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar player={player} size="lg" />
            <div>
              <div className="text-2xl font-bold">{player.nickname}</div>
              <div className={offline ? "text-coral" : "text-mint"}>
                {offline ? "● หลุดการเชื่อมต่อ" : "● ออนไลน์"}
              </div>
            </div>
          </div>
          <Button
            tone="sun"
            size="lg"
            onClick={async () => {
              if (await room.dispatch("room.transferHost", { playerId: player.id })) onClose();
            }}
          >
            <Crown size={22} /> โอนสิทธิ์หัวหน้าห้องให้
          </Button>
          <Button
            tone="coral"
            size="lg"
            onClick={async () => {
              if (await room.dispatch("room.kick", { playerId: player.id })) onClose();
            }}
          >
            <UserX size={22} /> เตะออกจากห้อง
          </Button>
        </div>
      )}
    </Modal>
  );
}
