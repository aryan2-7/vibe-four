"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NameModal({ open, onClose, onSave, initialName }: { open: boolean; onClose?: () => void; onSave: (name: string) => void; initialName: string }) {
  const [name, setName] = useState(initialName);
  useEffect(() => setName(initialName), [initialName, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-[#1e150e]/30 backdrop-blur-[6px]">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="w-full max-w-sm rounded-[20px] bg-[#fffeFB] border border-[#1e150e]/10 p-5 shadow-[0_20px_60px_rgba(30,21,14,0.18)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-[#1e150e] text-[#fdf8ec] flex items-center justify-center text-[13px] font-bold">Aa</div>
              <div>
                <h2 className="font-[family-name:var(--font-fraunces)] text-[18px] font-bold leading-none tracking-tight">Your display name</h2>
                <p className="text-[13px] text-[#8c7a60]">Saved on this device</p>
              </div>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aryan"
              maxLength={20}
              className="w-full rounded-[14px] bg-[#fdf8ec] border border-[#1e150e]/10 px-4 py-3.5 text-[16px] outline-none focus:border-[#dc2626]/50 focus:bg-white placeholder:text-[#8c7a60]/60"
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }}
            />
            <div className="mt-4 flex gap-2.5">
              {onClose && (
                <button onClick={onClose} className="flex-1 rounded-full py-3 bg-[#1e150e]/5 border border-[#1e150e]/10 font-semibold text-sm">
                  Cancel
                </button>
              )}
              <button
                disabled={!name.trim()}
                onClick={() => onSave(name.trim())}
                className="flex-1 rounded-full py-3 bg-[#1e150e] text-[#fdf8ec] font-bold text-sm disabled:opacity-40 active:scale-[0.99] transition"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
