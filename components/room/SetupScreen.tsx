"use client";

import { ArrowLeft, Play } from "lucide-react";
import { useRef, useState } from "react";
import { GAMES } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import type { GameId } from "@/lib/types";
import { ChallengeSetupPanel } from "../setup/ChallengeSetup";
import { FillSetupPanel } from "../setup/FillSetup";
import { GuessSetupPanel } from "../setup/GuessSetup";
import { SpySetupPanel } from "../setup/SpySetup";
import { OhanaSetupPanel } from "../setup/OhanaSetup";
import { WerewolfSetupPanel } from "../setup/WerewolfSetup";
import { WordsSetupPanel } from "../setup/WordsSetup";
import { Button, IconButton } from "../ui/Button";

export type FlushRef = React.RefObject<(() => Promise<void>) | null>;

export function SetupScreen({ game }: { game: GameId }) {
  const room = useRoom();
  const info = GAMES.find((g) => g.id === game)!;
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  const [starting, setStarting] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-36 pt-5">
      <div className="flex items-center gap-3">
        {room.isHost && (
          <IconButton label="กลับไปเลือกเกม" onClick={() => room.dispatch("hub.backToLobby")}>
            <ArrowLeft />
          </IconButton>
        )}
        <div
          className="card-3d flex flex-1 items-center gap-3 rounded-3xl px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${info.color}2e, ${info.color}0d 60%, rgb(255 255 255 / 0.03))`,
            borderColor: `${info.color}55`,
          }}
        >
          <span className="text-4xl">{info.emoji}</span>
          <div>
            <div className="text-2xl font-extrabold leading-tight tracking-tight" style={{ color: info.color }}>
              {info.title}
            </div>
            <div className="text-sm font-medium text-white/60">ตั้งค่าก่อนเริ่มเกม</div>
          </div>
        </div>
      </div>

      {game === "ohana" && <OhanaSetupPanel flushRef={flushRef} />}
      {game === "words" && <WordsSetupPanel flushRef={flushRef} />}
      {game === "werewolf" && <WerewolfSetupPanel flushRef={flushRef} />}
      {game === "challenge" && <ChallengeSetupPanel flushRef={flushRef} />}
      {game === "guess" && <GuessSetupPanel flushRef={flushRef} />}
      {game === "spy" && <SpySetupPanel flushRef={flushRef} />}
      {game === "fill" && <FillSetupPanel flushRef={flushRef} />}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090d16]/70 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {room.isHost ? (
            <Button
              tone="mint"
              size="xl"
              className="w-full"
              disabled={starting}
              onClick={async () => {
                setStarting(true);
                await flushRef.current?.();
                await room.dispatch("game.start");
                setStarting(false);
              }}
            >
              <Play size={28} className="fill-white" /> {starting ? "กำลังเริ่ม..." : "เริ่มเกม!"}
            </Button>
          ) : (
            <p className="py-3 text-center text-lg font-semibold text-muted">
              ⏳ รอหัวหน้าห้องกดเริ่มเกม...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
