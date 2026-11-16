import { Crown } from "lucide-react";
import type { Player } from "@/lib/types";

export function Avatar({
  player,
  size = "md",
  host,
  dim,
  className = "",
}: {
  player?: Player;
  size?: "sm" | "md" | "lg" | "xl";
  host?: boolean;
  dim?: boolean;
  className?: string;
}) {
  const s = {
    sm: "h-8 w-8 text-lg",
    md: "h-11 w-11 text-2xl",
    lg: "h-16 w-16 text-4xl",
    xl: "h-24 w-24 text-6xl",
  }[size];
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ${s} ${dim ? "opacity-40 grayscale" : ""}`}
      >
        {player?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL เล็กๆ ไม่ต้องผ่าน next/image
          <img src={player.avatar} alt={player.nickname} className="h-full w-full object-cover" draggable={false} />
        ) : (
          (player?.emoji ?? "❔")
        )}
      </div>
      {host && (
        <Crown
          className="absolute -right-2 -top-3 rotate-12 fill-sun text-sun drop-shadow"
          size={size === "sm" ? 14 : 20}
        />
      )}
    </div>
  );
}

export function PlayerName({ player, className = "" }: { player?: Player; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {player?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL เล็กๆ
        <img src={player.avatar} alt="" className="h-[1.25em] w-[1.25em] rounded-md object-cover" />
      ) : (
        <span>{player?.emoji ?? "❔"}</span>
      )}
      <span className="truncate">{player?.nickname ?? "ผู้เล่นที่ออกไปแล้ว"}</span>
    </span>
  );
}
