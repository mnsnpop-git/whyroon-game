"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "info" | "error" | "success";
interface ToastItem {
  id: number;
  text: string;
  kind: Kind;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const COLORS: Record<Kind, string> = {
  info: "border-sky/30 text-sky-100 shadow-[0_10px_40px_-12px_rgb(56_189_248/0.5)]",
  error: "border-rose-500/30 text-rose-200 shadow-[0_10px_40px_-12px_rgb(244_63_94/0.5)]",
  success: "border-emerald-400/30 text-emerald-100 shadow-[0_10px_40px_-12px_rgb(16_185_129/0.5)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((text: string, kind: Kind = "info") => {
    const id = ++idRef.current;
    setItems((list) => [...list.filter((x) => x.text !== text), { id, text, kind }].slice(-3));
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: -40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className={`pointer-events-auto max-w-sm rounded-2xl border bg-[#0e1422]/85 px-5 py-3 text-center text-base font-semibold backdrop-blur-xl ${COLORS[t.kind]}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
