"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  children,
  title,
  className = "",
  dismissable = true,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
  dismissable?: boolean;
}) {
  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[#05080f]/70 p-4 backdrop-blur-md sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dismissable && onClose?.()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`card-3d relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#0e1422]/80 p-6 ${className}`}
            initial={{ y: 80, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || (dismissable && onClose)) && (
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="text-xl font-bold tracking-tight">{title}</div>
                {dismissable && onClose && (
                  <button
                    type="button"
                    aria-label="ปิด"
                    onClick={onClose}
                    className="-mr-1 -mt-1 rounded-xl p-2 text-muted transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={22} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  // ย้ายไปไว้ที่ body เสมอ: ถ้า Modal อยู่ใต้ element ที่มี backdrop-filter/transform (เช่น header กระจกฝ้า)
  // position: fixed จะถูกจำกัดอยู่ในกรอบของ element นั้นแทนที่จะเต็มจอ
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
