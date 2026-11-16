"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fullSetup } from "../constants";
import { getSupabase } from "../supabase/client";
import type { ActionResponse, GameSetup, Player, Snapshot } from "../types";
import { callAction } from "./api";
import { useToast } from "./toast";

export interface RoomContextValue {
  code: string;
  me: string;
  snap: Snapshot;
  setup: GameSetup;
  players: Player[]; // active เท่านั้น
  allPlayers: Player[];
  isHost: boolean;
  host: Player | undefined;
  online: Set<string>;
  hostOfflineSince: number | null;
  player: (id: string | null | undefined) => Player | undefined;
  dispatch: (type: string, payload?: Record<string, unknown>) => Promise<boolean>;
  dispatchRaw: (type: string, payload?: Record<string, unknown>) => Promise<ActionResponse>;
  refresh: () => void;
  /** ออกจากหน้าห้อง กลับหน้าแรกของแอป (แสดงข้อความแจ้งเตือนได้) */
  exit: (message?: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
  return ctx;
}

type Status = "loading" | "ready" | "gone";

export function useRoomConnection(code: string, me: string) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState(false);
  const versionRef = useRef(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNow = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("get_snapshot", { p_code: code });
    if (error) {
      console.warn("[snapshot]", error.message);
      return;
    }
    if (!data) {
      setStatus("gone");
      return;
    }
    const s = data as Snapshot;
    if (s.room.version < versionRef.current) return; // ข้อมูลเก่ากว่า ข้าม
    versionRef.current = s.room.version;
    setSnap(s);
    setStatus("ready");
  }, [code]);

  /** รวมคำขอที่ติดกันให้เหลือครั้งเดียว */
  const refresh = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void fetchNow();
    }, 40);
  }, [fetchNow]);

  useEffect(() => {
    const supabase = getSupabase();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    refresh();

    (async () => {
      // ให้ realtime ใช้ JWT ของเรา (จำเป็นสำหรับ postgres_changes + RLS)
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      channel = supabase.channel(`room:${code}`, {
        config: { presence: { key: me }, broadcast: { self: false } },
      });
      channel
        .on("broadcast", { event: "sync" }, (msg) => {
          const v = (msg.payload as { version?: number } | undefined)?.version;
          if (typeof v !== "number" || v > versionRef.current) refresh();
        })
        .on("broadcast", { event: "deleted" }, () => {
          setDeleted(true);
          refresh();
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
          () => refresh(),
        )
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState() ?? {};
          setOnline(new Set(Object.keys(state)));
        })
        .subscribe((s) => {
          if (s === "SUBSCRIBED") {
            void channel?.track({ id: me, at: Date.now() });
            refresh();
          }
        });
    })();

    const poll = setInterval(() => refresh(), 12_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [code, me, fetchNow, refresh]);

  return { snap, status, online, refresh, deleted };
}

export function RoomProvider({
  code,
  me,
  snap,
  online,
  refresh,
  exit,
  children,
}: {
  code: string;
  me: string;
  snap: Snapshot;
  online: Set<string>;
  refresh: () => void;
  exit: (message?: string) => void;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const [hostOfflineSince, setHostOfflineSince] = useState<number | null>(null);
  const hostId = snap.room.host_id;
  const hostOnline = online.size === 0 || online.has(hostId);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ติดตามเวลาที่หัวหน้าห้องออฟไลน์
    setHostOfflineSince(hostOnline ? null : (prev) => prev ?? Date.now());
  }, [hostOnline, hostId]);

  const dispatchRaw = useCallback(
    async (type: string, payload?: Record<string, unknown>) => {
      const res = await callAction(type, code, payload);
      if (!res.ok) toast(res.error ?? "เกิดข้อผิดพลาด", "error");
      refresh();
      return res;
    },
    [code, refresh, toast],
  );

  const dispatch = useCallback(
    async (type: string, payload?: Record<string, unknown>) => (await dispatchRaw(type, payload)).ok,
    [dispatchRaw],
  );

  const value = useMemo<RoomContextValue>(() => {
    const byId = new Map(snap.players.map((p) => [p.id, p]));
    return {
      code,
      me,
      snap,
      setup: fullSetup(snap.setup),
      players: snap.players.filter((p) => p.status === "active"),
      allPlayers: snap.players,
      isHost: snap.room.host_id === me,
      host: byId.get(snap.room.host_id),
      online,
      hostOfflineSince,
      player: (id) => (id ? byId.get(id) : undefined),
      dispatch,
      dispatchRaw,
      refresh,
      exit,
    };
  }, [code, me, snap, online, hostOfflineSince, dispatch, dispatchRaw, refresh, exit]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
