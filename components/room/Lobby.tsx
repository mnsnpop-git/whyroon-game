"use client";

import { motion } from "motion/react";
import { Check, Copy, Crown, QrCode, Search, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useDeferredValue, useEffect, useState } from "react";
import { GAMES, GAME_CATEGORIES } from "@/lib/constants";
import { useRoom } from "@/lib/client/room-store";
import { useToast } from "@/lib/client/toast";
import type { Player } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Section } from "../ui/Section";
import { PlayerActionsModal } from "./PlayerActionsModal";

export function roomLink(code: string) {
  return `${window.location.origin}/?room=${code}`;
}

export function Lobby() {
  const room = useRoom();
  const toast = useToast();
  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Player | null>(null);
  const link = roomLink(room.code);

  async function copy() {
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
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-12 pt-5">
      {/* รหัสห้อง */}
      <motion.section
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card-3d relative overflow-hidden rounded-3xl bg-panel p-6 text-center"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-sky/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-mint/15 blur-3xl" />
        <p className="relative text-sm font-semibold uppercase tracking-[0.25em] text-muted">รหัสห้อง</p>
        <p className="text-gradient relative my-2 text-7xl font-extrabold tracking-[0.18em] drop-shadow-[0_0_24px_rgba(56,189,248,0.35)]">
          {room.code}
        </p>
        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <Button tone="ghost" onClick={copy}>
            {copied ? <Check size={20} /> : <Copy size={20} />} คัดลอกลิงก์
          </Button>
          <Button tone="sky" onClick={() => setQr(true)}>
            <QrCode size={20} /> QR Code
          </Button>
        </div>
      </motion.section>

      {/* ผู้เล่น */}
      <Section
        title={`ผู้เล่น (${room.players.length})`}
        icon={<Users size={20} className="text-sky" />}
        right={room.isHost && <span className="text-xs text-muted">แตะชื่อเพื่อจัดการ</span>}
      >
        <ul className="grid grid-cols-1 gap-2">
          {room.players.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              index={i}
              onClick={room.isHost && p.id !== room.me ? () => setSelected(p) : undefined}
            />
          ))}
        </ul>
      </Section>

      {/* เลือกเกม */}
      <Section title="เลือกเกม" icon={<span>🎮</span>}>
        {!room.isHost && (
          <p className="mb-4 rounded-2xl border border-white/5 bg-white/[0.04] p-3.5 text-center text-muted">
            ⏳ รอหัวหน้าห้องเลือกเกม...
          </p>
        )}
        <GamePicker disabled={!room.isHost} />
      </Section>

      <Modal open={qr} onClose={() => setQr(false)} title="สแกนเพื่อเข้าห้อง">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-[0_0_40px_-8px_rgba(56,189,248,0.45)] ring-1 ring-sky/30">
            <QRCodeSVG value={link} size={240} level="M" marginSize={0} />
          </div>
          <p className="text-gradient text-5xl font-extrabold tracking-[0.2em]">{room.code}</p>
          <p className="break-all text-center text-sm text-muted">{link}</p>
        </div>
      </Modal>

      <PlayerActionsModal player={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

export function PlayerRow({
  player,
  index,
  onClick,
  right,
}: {
  player: Player;
  index?: number;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  const room = useRoom();
  const isHost = room.snap.room.host_id === player.id;
  const offline = room.online.size > 0 && !room.online.has(player.id);
  const content = (
    <>
      <Avatar player={player} host={isHost} dim={offline} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-lg font-bold">
          {player.nickname}
          {player.id === room.me && <span className="text-sm font-medium text-sky">(คุณ)</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {isHost && (
            <span className="inline-flex items-center gap-1 text-sun">
              <Crown size={12} /> หัวหน้าห้อง
            </span>
          )}
          {offline ? (
            <span className="text-coral">● หลุดการเชื่อมต่อ</span>
          ) : (
            <span className="text-mint">● ออนไลน์</span>
          )}
        </div>
      </div>
      {right}
    </>
  );
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (index ?? 0) * 0.03 }}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-3 text-left transition-[background-color,border-color,transform] duration-200 hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.98]"
        >
          {content}
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-3">{content}</div>
      )}
    </motion.li>
  );
}

function GameTile({ game: g, wide, disabled }: { game: (typeof GAMES)[number]; wide: boolean; disabled: boolean }) {
  const room = useRoom();
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { y: -3 }}
      onClick={() => room.dispatch("hub.selectGame", { game: g.id })}
      className={`btn-3d group relative overflow-hidden rounded-[1.75rem] text-left text-white disabled:!opacity-100 disabled:!filter-none ${
        wide ? "col-span-2 flex items-center gap-4 p-5" : "flex min-h-44 flex-col justify-between p-4"
      }`}
      style={{
        background: `radial-gradient(120% 90% at ${wide ? "0% 0%" : "100% 0%"}, ${g.color}40, transparent 60%), linear-gradient(160deg, ${g.color}1f, rgb(255 255 255 / 0.03))`,
        borderColor: `${g.color}55`,
      }}
    >
      <span
        className={`pointer-events-none absolute rounded-full blur-2xl ${wide ? "-right-10 -top-10 h-36 w-36" : "-bottom-10 -right-10 h-28 w-28"}`}
        style={{ backgroundColor: `${g.color}33` }}
      />
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 drop-shadow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${
          wide ? "h-20 w-20 text-5xl" : "h-14 w-14 text-4xl"
        }`}
      >
        {g.emoji}
      </span>
      <span className={`relative min-w-0 ${wide ? "flex-1" : "mt-3"}`}>
        <span
          className={`block font-extrabold leading-tight tracking-tight ${wide ? "text-2xl" : "text-lg"}`}
          style={{ color: g.color }}
        >
          {g.title}
        </span>
        <span className={`block font-medium text-white/70 ${wide ? "text-sm" : "line-clamp-2 text-xs"}`}>{g.subtitle}</span>
        <span className="mt-2 inline-block rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70">
          {g.players}
        </span>
      </span>
    </motion.button>
  );
}

type CategoryId = (typeof GAME_CATEGORIES)[number]["id"];
const TAB_KEY = "raraeng-lobby-tab";

/** ตัดช่องว่าง/ตัวพิมพ์ใหญ่ เพื่อค้นได้ทั้ง "ใบ้ คำ" และ "ใบ้คำ" */
const norm = (t: string) => t.toLowerCase().normalize("NFC").replace(/\s+/g, "");

function matches(g: (typeof GAMES)[number], q: string) {
  if (!q) return true;
  const hay = norm([g.title, g.subtitle, g.players, g.keywords].join(" "));
  // ทุกคำที่พิมพ์ (คั่นด้วยเว้นวรรค) ต้องเจอ
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(norm(w)));
}

/** เลือกเกม: แท็บหมวดหมู่ + ค้นหา (ค้นหาข้ามทุกหมวด) */
function GamePicker({ disabled }: { disabled: boolean }) {
  const [tab, setTab] = useState<CategoryId>("board");
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());

  // จำแท็บล่าสุดไว้ในเครื่อง (ถ้าเบราว์เซอร์ไม่อนุญาตก็ใช้ค่าเริ่มต้น)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved && GAME_CATEGORIES.some((c) => c.id === saved)) {
        const id = setTimeout(() => setTab(saved as CategoryId), 0);
        return () => clearTimeout(id);
      }
    } catch {
      /* private mode */
    }
  }, []);
  const pickTab = (id: CategoryId) => {
    setTab(id);
    setQuery("");
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      /* private mode */
    }
  };

  const searching = q.length > 0;
  const list = searching ? GAMES.filter((g) => matches(g, q)) : GAMES.filter((g) => g.category === tab);
  const cat = GAME_CATEGORIES.find((c) => c.id === tab)!;

  return (
    <div className="flex flex-col gap-4">
      {/* ค้นหา */}
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 40))}
          placeholder="ค้นหาเกม เช่น สายลับ, ใบ้คำ, card..."
          aria-label="ค้นหาเกม"
          enterKeyHint="search"
          className="w-full rounded-2xl border border-white/15 bg-black/30 py-3 pl-11 pr-11 text-base font-semibold text-white placeholder:font-medium placeholder:text-white/35 transition focus:border-sky/60 focus:outline-none focus:ring-4 focus:ring-sky/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="ล้างคำค้นหา"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* แท็บหมวดหมู่ */}
      <div role="tablist" aria-label="หมวดหมู่เกม" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
        {GAME_CATEGORIES.map((c) => {
          const active = !searching && tab === c.id;
          const count = GAMES.filter((g) => g.category === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickTab(c.id)}
              className={`relative rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                active ? "text-ink" : "text-white/70 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="lobby-tab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky to-mint shadow-[0_8px_24px_-10px_rgba(56,189,248,0.8)]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">
                {c.title} <span className={active ? "opacity-70" : "text-muted"}>({count})</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="-mt-1 px-1 text-xs text-muted">
        {searching ? `ผลการค้นหา "${q}" — ${list.length} เกม (ทุกหมวด)` : cat.subtitle}
      </p>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
          <div className="text-4xl">🔎</div>
          <p className="mt-2 font-semibold">ไม่พบเกมที่ตรงกับ &quot;{q}&quot;</p>
          <button type="button" onClick={() => setQuery("")} className="mt-2 text-sm text-sky underline-offset-4 hover:underline">
            ล้างคำค้นหา
          </button>
        </div>
      ) : (
        // Bento: จำนวนคี่ → ใบแรกเต็มแถว ที่เหลือเป็นช่องสี่เหลี่ยม 2 คอลัมน์
        <motion.div
          key={searching ? "search" : tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          role="tabpanel"
          className="grid grid-cols-2 gap-3"
        >
          {list.map((g, i) => (
            <GameTile key={g.id} game={g} wide={i === 0 && list.length % 2 === 1} disabled={disabled} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
