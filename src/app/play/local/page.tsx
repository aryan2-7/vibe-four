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
    const p2s = localStorage.getItem("vibe-four:p2name") || "Player 2";
    const m = localStorage.getItem("vibe-four:muted") === "1";
    setP1(n); setP2(p2s); setMuted(m);
  }, []);

  function saveP1(name: string) { setP1(name); localStorage.setItem("vibe-four:name", name); }
  function saveP2(name: string) { setP2(name); localStorage.setItem("vibe-four:p2name", name); }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-[10px] bg-[#fdf8ec]/85 border-b border-[#1e150e]/8">
        <div className="max-w-[580px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <Link href="/" className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center">←</Link>
          <div className="font-[family-name:var(--font-fraunces)] font-bold">Pass & Play</div>
          <button onClick={() => { const nv = !muted; setMuted(nv); localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); }} className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center text-sm">{muted ? "·" : "♪"}</button>
        </div>
      </header>

      <div className="flex-1 py-5">
        <div className="max-w-[580px] mx-auto px-4 flex items-center gap-2 mb-4">
          <button onClick={() => { setEditTarget(1); setShowNameModal(true); }} className="rounded-full bg-white border border-[#1e150e]/10 px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-[#dc2626] text-white flex items-center justify-center text-[10px] font-bold">1</span> {p1}</button>
          <span className="text-[#8c7a60] text-xs">vs</span>
          <button onClick={() => { setEditTarget(2); setShowNameModal(true); }} className="rounded-full bg-white border border-[#1e150e]/10 px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-[#5cc87a] text-white flex items-center justify-center text-[10px] font-bold">2</span> {p2}</button>
        </div>
        <LocalGame p1Name={p1} p2Name={p2} muted={muted} />
      </div>

      <NameModal open={showNameModal} initialName={editTarget === 2 ? p2 : p1} onClose={() => setShowNameModal(false)} onSave={(n) => { if (editTarget === 2) saveP2(n); else saveP1(n); setShowNameModal(false); }} />
    </main>
  );
}
