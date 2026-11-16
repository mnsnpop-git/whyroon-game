"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/lib/client/room-store";
import { ChallengeGame } from "../games/challenge/ChallengeGame";
import { FillGame } from "../games/fill/FillGame";
import { GuessGame } from "../games/guess/GuessGame";
import { SpyGame } from "../games/spy/SpyGame";
import { OhanaGame } from "../games/ohana/OhanaGame";
import { WerewolfGame } from "../games/werewolf/WerewolfGame";
import { WordsGame } from "../games/words/WordsGame";
import { Button } from "../ui/Button";
import { Lobby } from "./Lobby";
import { RoomSettingsButton } from "./RoomSettings";
import { SetupScreen } from "./SetupScreen";

const HOST_OFFLINE_GRACE = 20_000;

export function RoomScreen() {
  const room = useRoom();
  const { snap, isHost, host } = room;

  let body: React.ReactNode = null;
  if (snap.room.stage === "lobby" || !snap.room.game) body = <Lobby />;
  else if (snap.room.stage === "setup") body = <SetupScreen game={snap.room.game} />;
  else if (snap.state?.kind === "ohana") body = <OhanaGame />;
  else if (snap.state?.kind === "words") body = <WordsGame />;
  else if (snap.state?.kind === "werewolf") body = <WerewolfGame />;
  else if (snap.state?.kind === "challenge") body = <ChallengeGame />;
  else if (snap.state?.kind === "guess") body = <GuessGame />;
  else if (snap.state?.kind === "spy") body = <SpyGame />;
  else if (snap.state?.kind === "fill") body = <FillGame />;
  else body = <Lobby />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090d16]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-2 px-5 py-2.5">
          <span className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-2.5 py-0.5 text-lg font-extrabold tracking-[0.2em] text-sky">
            {room.code}
          </span>
          {/* ใครเป็นหัวหน้าห้อง (ทุกคนเห็น) */}
          <div
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-sun/20 bg-sun/[0.07] px-2.5 py-1 text-sm"
            title="หัวหน้าห้อง"
          >
            <span aria-hidden>👑</span>
            <span className="shrink-0">{host?.emoji ?? "❔"}</span>
            <span className="min-w-0 truncate font-semibold text-sun">{host?.nickname ?? "ไม่มีหัวหน้าห้อง"}</span>
            {isHost && <span className="shrink-0 text-xs font-medium text-sky">(คุณ)</span>}
          </div>
          <RoomSettingsButton className="shrink-0" />
        </div>
        <HostOfflineBanner />
      </header>

      {body}
    </div>
  );
}

function HostOfflineBanner() {
  const room = useRoom();
  const [, force] = useState(0);
  const since = room.hostOfflineSince;
  useEffect(() => {
    if (!since) return;
    const t = setTimeout(() => force((n) => n + 1), HOST_OFFLINE_GRACE + 200);
    return () => clearTimeout(t);
  }, [since]);
  // eslint-disable-next-line react-hooks/purity -- อ่านเวลาเพื่อเช็กว่าออฟไลน์นานพอหรือยัง
  const show = !room.isHost && since !== null && Date.now() - since > HOST_OFFLINE_GRACE;
  if (!show) return null;
  const host = room.player(room.snap.room.host_id);
  return (
    <div className="mx-auto flex max-w-md items-center justify-between gap-2 border-b border-rose-500/30 bg-rose-500/20 px-5 py-2.5 text-sm font-semibold text-rose-200 backdrop-blur-xl">
      <span>
        {host?.emoji} {host?.nickname} (หัวหน้าห้อง) หลุดการเชื่อมต่อ
      </span>
      <Button tone="sky" size="sm" onClick={() => room.dispatch("room.claimHost")}>
        รับเป็นหัวหน้าแทน
      </Button>
    </div>
  );
}
