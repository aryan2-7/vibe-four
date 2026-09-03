"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import NameModal from "@/components/NameModal";
import { sfxClick } from "@/lib/sounds";

export default function Home() {
  const [name, setName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vibe-four:name") || "";
    const m = localStorage.getItem("vibe-four:muted") === "1";
    if (stored) setName(stored);
    if (m) setMuted(m);
    if (!stored) setTimeout(() => setShowNameModal(true), 500);
  }, []);

  function handleSaveName(n: string) {
    setName(n);
    localStorage.setItem("vibe-four:name", n);
    setShowNameModal(false);
    if (pendingHref) { window.location.href = pendingHref; setPendingHref(null); }
  }
  function guardNav(href: string, e: React.MouseEvent) {
    sfxClick(muted);
    if (!name.trim()) { e.preventDefault(); setPendingHref(href); setShowNameModal(true); }
  }
  function toggleMute() {
    const nv = !muted; setMuted(nv); localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); sfxClick(nv);
  }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-[10px] bg-[#fdf8ec]/85 border-b border-[#1e150e]/8">
        <div className="max-w-[580px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#1e150e] text-[#fdf8ec] flex items-center justify-center font-[family-name:var(--font-fraunces)] font-bold text-[14px]">4</div>
            <div className="leading-none">
              <div className="font-[family-name:var(--font-fraunces)] font-bold text-[16px] tracking-tight">VIBE FOUR</div>
              <div className="text-[10px] tracking-[0.16em] font-semibold text-[#8c7a60] uppercase">Connect Four</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} aria-label="Toggle sound" className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center text-[13px] active:scale-95">{muted ? "·" : "♪"}</button>
            <button onClick={() => setShowNameModal(true)} className="inline-flex items-center gap-2 rounded-full bg-white border border-[#1e150e]/12 px-3 py-1.5 text-sm font-medium">
              <span className="h-6 w-6 rounded-full bg-[#1e150e] text-white flex items-center justify-center text-xs font-bold">{name ? name[0].toUpperCase() : "?"}</span>
              <span className="hidden sm:inline max-w-[12ch] truncate">{name || "Set name"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[580px] w-full mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {/* hero — editorial, not AI card */}
        <div className="border border-[#1e150e]/10 rounded-[20px] bg-white p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-fraunces)] text-[32px] sm:text-[36px] font-bold leading-[0.95] tracking-tight text-[#1e150e]">
                Four in a row.<br />
                <span className="font-medium italic text-[#8c7a60]">No setup.</span>
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#5c4a32] max-w-[34ch]">
                Create a room, share the 4-letter code, play on any phone. Or pass-and-play on one device.
              </p>
            </div>
            <div className="hidden sm:flex h-[88px] w-[88px] rounded-[18px] bg-[#fdf8ec] border border-[#1e150e]/8 items-center justify-center">
              {/* subtle board glyph */}
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }).map((_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i % 3 === 0 ? "bg-[#dc2626]" : i % 3 === 1 ? "bg-[#5cc87a]" : "bg-[#1e150e]/8"}`} />)}
              </div>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-4 grid gap-3">
          <Link href="/play/online" onClick={(e) => guardNav("/play/online", e)} className="group flex items-center gap-4 rounded-[16px] bg-[#1e150e] text-[#fdf8ec] px-5 py-4 active:scale-[0.99] transition">
            <span className="h-10 w-10 rounded-full bg-white text-[#1e150e] flex items-center justify-center font-bold">→</span>
            <span className="flex-1">
              <span className="block font-semibold leading-none">Play online</span>
              <span className="block text-sm opacity-70 leading-none mt-1">Create or join with code</span>
            </span>
            <span className="text-sm opacity-60 group-hover:opacity-100">Open</span>
          </Link>
          <Link href="/play/local" onClick={(e) => guardNav("/play/local", e)} className="flex items-center gap-4 rounded-[16px] bg-white border border-[#1e150e]/10 px-5 py-4 active:scale-[0.99] transition">
            <span className="h-10 w-10 rounded-full bg-[#fdf8ec] border border-[#1e150e]/10 flex items-center justify-center">◐</span>
            <span className="flex-1">
              <span className="block font-semibold leading-none">Pass & Play</span>
              <span className="block text-sm text-[#8c7a60] leading-none mt-1">Offline · one phone</span>
            </span>
            <span className="text-sm text-[#8c7a60]">Open</span>
          </Link>
        </div>

        {/* minimal footer */}
        <div className="mt-auto pt-8 text-center text-xs text-[#8c7a60]">
          Codes expire in 4 hours · No account
        </div>
      </div>

      <NameModal open={showNameModal} onSave={handleSaveName} initialName={name} onClose={name ? () => setShowNameModal(false) : undefined} />
    </main>
  );
}
