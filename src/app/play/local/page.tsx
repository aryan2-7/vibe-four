"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LocalGame from "@/components/LocalGame";
import NameModal from "@/components/NameModal";

export default function LocalPlayPage() {
  const [p1, setP1] = useState("Player 1");
  const [p2, setP2] = useState("Player 2");
  const [muted, setMuted] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [editTarget, setEditTarget] = useState<1 | 2 | null>(null);

  useEffect(() => {
    const n = localStorage.getItem("vibe-four:name") || "Player 1";
    const p2stored = localStorage.getItem("vibe-four:p2name") || "Player 2";
    const m = localStorage.getItem("vibe-four:muted") === "1";
    setP1(n);
    setP2(p2stored);
    setMuted(m);
  }, []);

  function saveP1(name: string) {
    setP1(name);
    localStorage.setItem("vibe-four:name", name);
  }
  function saveP2(name: string) {
    setP2(name);
    localStorage.setItem("vibe-four:p2name", name);
  }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a12]/70 border-b border-white/10">
        <div className="max-w-[560px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <Link href="/" className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">←</Link>
          <div className="font-[family-name:var(--font-fredoka)] font-bold">PASS & PLAY</div>
          <button onClick={() => setMuted((m) => { const nv = !m; localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); return nv; })} className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </header>

      <div className="flex-1 py-6">
        <div className="max-w-[560px] mx-auto px-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditTarget(1); setShowNameModal(true); }} className="rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-[11px]">1</span> {p1} ✎
            </button>
            <span className="text-white/30 text-xs">vs</span>
            <button onClick={() => { setEditTarget(2); setShowNameModal(true); }} className="rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center text-[11px]">2</span> {p2} ✎
            </button>
          </div>
        </div>

        <LocalGame p1Name={p1} p2Name={p2} muted={muted} />
      </div>

      <NameModal
        open={showNameModal}
        initialName={editTarget === 2 ? p2 : p1}
        onClose={() => setShowNameModal(false)}
        onSave={(n) => {
          if (editTarget === 2) saveP2(n);
          else saveP1(n);
          setShowNameModal(false);
        }}
      />
    </main>
  );
}
