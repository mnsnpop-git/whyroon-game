"use client";

import { use, useCallback, useEffect, useState } from "react";
import { browser } from "react-dom";
import { callAction, syncClock } from "@/lib/client/api";
import { RoomProvider, useRoomConnection } from "@/lib/client/room-store";
import {
  type SavedProfile,
  loadLastRoom,
  loadProfile,
  saveLastRoom,
  saveProfile,
} from "@/lib/client/storage";
import { ToastProvider, useToast } from "@/lib/client/toast";
import { ensureSession, getSupabase } from "@/lib/supabase/client";
import type { Snapshot } from "@/lib/types";
import { HomeScreen } from "./home/HomeScreen";
import { ProfileScreen } from "./home/ProfileScreen";
import { WaitingScreen } from "./home/WaitingScreen";
import { RoomScreen } from "./room/RoomScreen";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Splash } from "./ui/Splash";

type View =
  | { name: "boot" }
  | { name: "error"; message: string }
  | { name: "home" }
  | { name: "profile"; mode: "create" | "join"; code?: string }
  | { name: "waiting"; code: string; profile: SavedProfile; waitKey: string; reason: string }
  | { name: "room"; code: string };

function setUrlRoom(code: string | null) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("room", code);
  else url.searchParams.delete("room");
  window.history.replaceState(null, "", url.pathname + url.search);
}

function readUrlRoom(): string | null {
  const raw = new URLSearchParams(window.location.search).get("room");
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

export default function PartyApp() {
  use(browser("ใช้ localStorage และ session ของเบราว์เซอร์"));
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const toast = useToast();
  const [view, setView] = useState<View>({ name: "boot" });
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SavedProfile | null>(() => loadProfile());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // ---------- boot: anonymous session + กลับเข้าห้องเดิมอัตโนมัติ ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ userId: uid }] = await Promise.all([ensureSession(), syncClock()]);
        if (cancelled) return;
        setUserId(uid);
        const urlCode = readUrlRoom();
        const candidate = urlCode ?? loadLastRoom();
        if (candidate) {
          const { data } = await getSupabase().rpc("get_snapshot", { p_code: candidate });
          const snap = data as Snapshot | null;
          const me = snap?.players.find((p) => p.id === uid);
          if (cancelled) return;
          if (me?.status === "active") {
            setUrlRoom(candidate);
            setView({ name: "room", code: candidate });
            return;
          }
          if (urlCode) {
            setView({ name: "profile", mode: "join", code: urlCode });
            return;
          }
          saveLastRoom(null);
        }
        setView({ name: "home" });
      } catch (e) {
        if (!cancelled) setView({ name: "error", message: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ถ้าบัญชีเปลี่ยน (เช่น แท็บอื่นเข้าสู่ระบบใหม่) ให้ใช้ id ปัจจุบันเสมอ
  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session?.user.id) setUserId(session.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /** ใช้ id เดียวกับบัญชีที่เพิ่งส่งคำขอเข้าห้อง */
  const syncUserId = useCallback(async () => {
    try {
      const { userId: uid } = await ensureSession();
      setUserId(uid);
    } catch {
      /* ignore */
    }
  }, []);

  const goHome = useCallback((message?: string) => {
    saveLastRoom(null);
    setUrlRoom(null);
    setView({ name: "home" });
    if (message) setNotice(message);
  }, []);

  const enterRoom = useCallback(
    async (mode: "create" | "join", p: SavedProfile, code?: string) => {
      setBusy(true);
      saveProfile(p);
      setProfile(p);
      const res =
        mode === "create"
          ? await callAction("room.create", undefined, { ...p })
          : await callAction("room.join", code, { ...p });
      setBusy(false);
      if (!res.ok && mode === "join" && res.data?.wait && code) {
        // เกมกำลังเล่นกลางตา → ไปหน้ารอ แล้วลองเข้าใหม่อัตโนมัติ
        setUrlRoom(code);
        setView({
          name: "waiting",
          code,
          profile: p,
          waitKey: String(res.data.key ?? ""),
          reason: res.error ?? "เกมกำลังเล่นอยู่ รอจบตานี้ก่อนนะ",
        });
        return;
      }
      if (!res.ok) {
        toast(res.error ?? "เข้าห้องไม่สำเร็จ", "error");
        return;
      }
      const roomCode = mode === "create" ? (res.data?.code as string) : code!;
      await syncUserId();
      saveLastRoom(roomCode);
      setUrlRoom(roomCode);
      setView({ name: "room", code: roomCode });
    },
    [toast, syncUserId],
  );

  let content: React.ReactNode;
  switch (view.name) {
    case "boot":
      content = <Splash />;
      break;
    case "error":
      content = (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold">เชื่อมต่อไม่สำเร็จ</h1>
          <p className="text-muted">{view.message}</p>
          <Button tone="sun" onClick={() => window.location.reload()}>
            ลองใหม่
          </Button>
        </div>
      );
      break;
    case "home":
      content = (
        <HomeScreen
          onCreate={() => setView({ name: "profile", mode: "create" })}
          onJoin={(code) => setView({ name: "profile", mode: "join", code })}
        />
      );
      break;
    case "profile":
      content = (
        <ProfileScreen
          mode={view.mode}
          code={view.code}
          initial={profile}
          busy={busy}
          onBack={() => goHome()}
          onSubmit={(p) => enterRoom(view.mode, p, view.code)}
        />
      );
      break;
    case "waiting":
      content = (
        <WaitingScreen
          code={view.code}
          profile={view.profile}
          waitKey={view.waitKey}
          reason={view.reason}
          onJoined={async () => {
            await syncUserId();
            saveLastRoom(view.code);
            setUrlRoom(view.code);
            setView({ name: "room", code: view.code });
            toast("เข้าห้องแล้ว! 🎉", "success");
          }}
          onFail={(message) => goHome(message)}
          onCancel={() => goHome()}
        />
      );
      break;
    case "room":
      content = userId ? (
        <RoomGate key={view.code} code={view.code} me={userId} onExit={goHome} />
      ) : (
        <Splash />
      );
      break;
  }

  return (
    <>
      {content}
      <Modal open={!!notice} onClose={() => setNotice(null)} title="แจ้งเตือน">
        <p className="mb-5 text-lg">{notice}</p>
        <Button tone="violet" size="lg" className="w-full" onClick={() => setNotice(null)}>
          ตกลง
        </Button>
      </Modal>
    </>
  );
}

function RoomGate({
  code,
  me,
  onExit,
}: {
  code: string;
  me: string;
  onExit: (message?: string) => void;
}) {
  const { snap, status, online, refresh, deleted } = useRoomConnection(code, me);
  const myStatus = snap?.players.find((p) => p.id === me)?.status;

  useEffect(() => {
    if (status === "gone") {
      onExit(deleted ? `หัวหน้าห้องลบห้อง ${code} แล้ว 👋` : `ไม่พบห้อง ${code} หรือคุณไม่ได้อยู่ในห้องนี้แล้ว`);
    }
    else if (myStatus === "kicked") onExit("คุณถูกหัวหน้าห้องเชิญออกจากห้อง 👋");
    else if (myStatus === "left") onExit();
  }, [status, myStatus, code, onExit, deleted]);

  // ห้องโหลดแล้วแต่ไม่เจอตัวเราในห้อง → อย่าค้างหน้าโหลดตลอดไป
  const missing = status === "ready" && !!snap && myStatus === undefined;
  useEffect(() => {
    if (!missing) return;
    const t = setTimeout(() => onExit(`เข้าห้อง ${code} ไม่สำเร็จ ลองกดเข้าห้องอีกครั้งนะ`), 8000);
    return () => clearTimeout(t);
  }, [missing, code, onExit]);

  if (!snap || status !== "ready" || myStatus !== "active") {
    return <Splash text={`กำลังเข้าห้อง ${code}...`} />;
  }

  return (
    <RoomProvider code={code} me={me} snap={snap} online={online} refresh={refresh} exit={onExit}>
      <RoomScreen />
    </RoomProvider>
  );
}
