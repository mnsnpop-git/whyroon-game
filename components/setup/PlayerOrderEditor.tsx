"use client";

import { Reorder, useDragControls } from "motion/react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Shuffle, X } from "lucide-react";
import { useRoom } from "@/lib/client/room-store";
import type { Player } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

function shuffled<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** จัดคิวผู้เล่น: ติ๊กเชิญ / สุ่มลำดับ / ลากวาง / เลื่อนขึ้น-ลง */
export function PlayerOrderEditor({
  order,
  onChange,
  editable,
  invite = true,
}: {
  order: string[];
  onChange: (order: string[]) => void;
  editable: boolean;
  invite?: boolean;
}) {
  const room = useRoom();
  const invited = order.filter((id) => room.players.some((p) => p.id === id));
  const others = room.players.filter((p) => !invited.includes(p.id));

  const move = (idx: number, dir: -1 | 1) => {
    const next = invited.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div>
      {editable && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-muted">ลาก ☰ หรือกดลูกศร เพื่อเรียงตามวงนั่งจริง</p>
          <Button tone="sun" size="sm" onClick={() => onChange(shuffled(invited))}>
            <Shuffle size={16} /> สุ่มลำดับ
          </Button>
        </div>
      )}

      {editable ? (
        <Reorder.Group axis="y" values={invited} onReorder={onChange} className="flex flex-col gap-2">
          {invited.map((id, i) => (
            <OrderItem
              key={id}
              id={id}
              index={i}
              player={room.player(id)}
              host={room.snap.room.host_id === id}
              last={i === invited.length - 1}
              onMove={(d) => move(i, d)}
              onRemove={invite ? () => onChange(invited.filter((x) => x !== id)) : undefined}
            />
          ))}
        </Reorder.Group>
      ) : (
        <ol className="flex flex-col gap-2">
          {invited.map((id, i) => (
            <li key={id} className="flex items-center gap-3 rounded-2xl bg-panel2 p-2">
              <span className="w-7 text-center text-xl font-extrabold text-sun">{i + 1}</span>
              <Avatar player={room.player(id)} size="sm" host={room.snap.room.host_id === id} />
              <span className="truncate text-lg font-semibold">{room.player(id)?.nickname}</span>
              {id === room.me && <span className="text-sm text-sky">(คุณ)</span>}
            </li>
          ))}
        </ol>
      )}

      {invite && others.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-muted">พักตานี้ ({others.length})</p>
          <div className="flex flex-wrap gap-2">
            {others.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!editable}
                onClick={() => onChange([...invited, p.id])}
                className="btn-3d inline-flex items-center gap-1.5 rounded-2xl bg-panel2 px-3 py-1.5 text-base opacity-70"
              >
                {editable && <Plus size={16} className="text-mint" />}
                {p.emoji} {p.nickname}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderItem({
  id,
  index,
  player,
  host,
  last,
  onMove,
  onRemove,
}: {
  id: string;
  index: number;
  player?: Player;
  host: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove?: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-2xl bg-panel2 p-2"
      whileDrag={{ scale: 1.04, boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 10 }}
    >
      <button
        type="button"
        aria-label="ลากเพื่อย้าย"
        className="cursor-grab touch-none p-1 text-muted active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical />
      </button>
      <span className="w-6 text-center text-xl font-extrabold text-sun">{index + 1}</span>
      <Avatar player={player} size="sm" host={host} />
      <span className="min-w-0 flex-1 truncate text-lg font-semibold">{player?.nickname}</span>
      <button
        type="button"
        aria-label="เลื่อนขึ้น"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="rounded-lg p-1.5 text-white disabled:opacity-20"
      >
        <ChevronUp />
      </button>
      <button
        type="button"
        aria-label="เลื่อนลง"
        disabled={last}
        onClick={() => onMove(1)}
        className="rounded-lg p-1.5 text-white disabled:opacity-20"
      >
        <ChevronDown />
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label="ให้พักตานี้"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-coral"
        >
          <X />
        </button>
      )}
    </Reorder.Item>
  );
}
