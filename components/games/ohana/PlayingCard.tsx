"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import type { Card, Rank } from "@/lib/types";

const RED = new Set(["♥", "♦"]);

/** รูปประกอบของไพ่แต่ละหมายเลข วางไฟล์ไว้ที่ public/cards/<rank>.png (เช่น A.png, 10.png, K.png) */
export const cardArtSrc = (rank: Rank) => `/cards/${rank}.png`;

// จำหมายเลขที่ยังไม่มีไฟล์รูป จะได้ไม่โหลด 404 ซ้ำทุกครั้งที่จั่ว
const missingArt = new Set<Rank>();

function CardArt({ rank }: { rank: Rank }) {
  const [failed, setFailed] = useState(() => missingArt.has(rank));
  if (failed) return null;
  return (
    <Image
      src={cardArtSrc(rank)}
      alt=""
      fill
      sizes="160px"
      loading="eager"
      className="object-cover"
      onError={() => {
        missingArt.add(rank);
        setFailed(true);
      }}
    />
  );
}

function CornerIndex({ card, flip = false }: { card: Card; flip?: boolean }) {
  return (
    <div
      className={`absolute z-10 flex flex-col items-center rounded-xl bg-white/90 px-1.5 py-1 text-xl font-extrabold leading-none shadow ${
        flip ? "bottom-2 right-2 rotate-180" : "left-2 top-2"
      }`}
    >
      {card.rank}
      <span className="text-lg">{card.suit}</span>
    </div>
  );
}

export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div className={`card-back flex h-full w-full items-center justify-center rounded-3xl ${className}`}>
      <div className="card-back__pattern" />
      <div className="card-back__frame" />
      {/* มุมประดับ */}
      {["left-4 top-4", "right-4 top-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos) => (
        <span key={pos} className={`absolute ${pos} text-[10px] leading-none text-gold/70`}>
          ✦
        </span>
      ))}
      {/* ตราสัญลักษณ์กลางไพ่ */}
      <div className="relative flex h-20 w-20 rotate-45 items-center justify-center rounded-2xl border border-gold/60 bg-[#0b1636]/80 shadow-[0_0_30px_-4px_rgba(56,189,248,0.45),inset_0_0_0_4px_rgba(5,10,26,0.7),inset_0_0_0_5px_rgba(217,185,121,0.3)]">
        <div className="-rotate-45 text-center leading-none">
          <div className="bg-gradient-to-b from-[#f7e7c1] to-[#b8955a] bg-clip-text text-3xl font-extrabold text-transparent">
            ✦
          </div>
          <div className="mt-1 text-[9px] font-semibold tracking-[0.3em] text-gold/80">RR</div>
        </div>
      </div>
      <div className="card-back__sheen" />
    </div>
  );
}

export function CardFace({ card, small = false }: { card: Card; small?: boolean }) {
  const red = RED.has(card.suit);
  if (small) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-xl border border-gold/50 bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)] ${red ? "text-rose-600" : "text-ink"}`}
      >
        <span className="text-2xl font-extrabold leading-none">{card.rank}</span>
        <span className="text-lg leading-none">{card.suit}</span>
      </div>
    );
  }
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl border-[3px] border-[#e9d5a4] bg-white shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85),0_0_40px_-12px_rgba(217,185,121,0.45)] ${red ? "text-rose-600" : "text-ink"}`}
    >
      {/* แบบเดิม (แสดงเมื่อยังไม่มีรูป หรือระหว่างโหลด) */}
      <div className="absolute inset-0 flex items-center justify-center text-7xl font-extrabold leading-none">
        {card.rank}
        <span className="text-5xl">{card.suit}</span>
      </div>
      <CardArt key={card.rank} rank={card.rank} />
      <CornerIndex card={card} />
      <CornerIndex card={card} flip />
    </div>
  );
}

/** ไพ่ที่พลิกจากหลังไปหน้า */
export function FlipCard({ card, size = "lg" }: { card: Card; size?: "md" | "lg" }) {
  const dims = size === "lg" ? "h-56 w-40" : "h-40 w-28";
  return (
    <div className={`relative ${dims} [perspective:1000px]`}>
      <motion.div
        className="preserve-3d relative h-full w-full"
        initial={{ rotateY: 180, scale: 0.6, y: 40 }}
        animate={{ rotateY: 0, scale: 1, y: 0 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 120, damping: 14 }}
      >
        <div className="backface-hidden absolute inset-0">
          <CardFace card={card} />
        </div>
        <div className="backface-hidden absolute inset-0 [transform:rotateY(180deg)]">
          <CardBack />
        </div>
      </motion.div>
    </div>
  );
}
