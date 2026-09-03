"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NameModal({ open, onClose, onSave, initialName }: { open: boolean; onClose?: () => void; onSave: (name: string) => void; initialName: string }) {
  const [name, setName] = useState(initialName);

  useEffect(() => setName(initialName), [initialName, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="w-full max-w-sm rounded-[28px] bg-[#1a1b2e] border border-white/10 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl">👤</div>
              <div>
                <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold leading-none">Your name</h2>
                <p className="text-sm text-white/60">This stays on your device</p>
              </div>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aryan"
              maxLength={20}
              className="w-full rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3.5 text-[16px] outline-none focus:border-violet-500 focus:bg-white/[0.09] placeholder:text-white/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onSave(name.trim());
              }}
            />
            <div className="mt-5 flex gap-3">
              {onClose && (
                <button onClick={onClose} className="flex-1 rounded-2xl py-3.5 bg-white/10 font-semibold">
                  Cancel
                </button>
              )}
              <button
                disabled={!name.trim()}
                onClick={() => onSave(name.trim())}
                className="flex-1 rounded-2xl py-3.5 bg-gradient-to-br from-violet-600 to-fuchsia-600 font-bold shadow-lg shadow-violet-600/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition"
              >
                Save & Play
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-white/40">You can change it anytime from the menu</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
