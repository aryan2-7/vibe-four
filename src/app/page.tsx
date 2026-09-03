"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    const m = localStorage.getItem("vibe-four:muted");
    if (stored) setName(stored);
    if (m) setMuted(m === "1");
    if (!stored) setTimeout(() => setShowNameModal(true), 600);
  }, []);

  function handleSaveName(newName: string) {
    setName(newName);
    localStorage.setItem("vibe-four:name", newName);
    setShowNameModal(false);
    if (pendingHref) {
      window.location.href = pendingHref;
      setPendingHref(null);
    }
  }

  function guardNav(href: string, e: React.MouseEvent) {
    sfxClick(muted);
    if (!name.trim()) {
      e.preventDefault();
      setPendingHref(href);
      setShowNameModal(true);
    }
  }

  function toggleMute() {
    const nv = !muted;
    setMuted(nv);
    localStorage.setItem("vibe-four:muted", nv ? "1" : "0");
    sfxClick(nv);
  }

  return (
    <main className="flex-1 flex flex-col min-h-[100dvh]">
      {/* header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a12]/60 border-b border-white/[0.06]">
        <div className="max-w-[560px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center font-black text-white shadow-lg shadow-violet-600/20">4</div>
            <div>
              <div className="font-[family-name:var(--font-fredoka)] font-bold leading-none tracking-tight">VIBE FOUR</div>
              <div className="text-[11px] text-white/50 font-medium tracking-widest uppercase">Connect 4 • Reimagined</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="h-9 w-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center active:scale-95 transition">
              <span className="text-sm">{muted ? "🔇" : "🔊"}</span>
            </button>
            <button onClick={() => setShowNameModal(true)} className="hidden sm:flex items-center gap-2 rounded-full bg-white text-[#0a0a12] px-3.5 py-2 text-sm font-bold">
              <span className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs">{name ? name[0].toUpperCase() : "?"}</span>
              {name ? name : "Set name"}
            </button>
            <button onClick={() => setShowNameModal(true)} className="sm:hidden h-9 w-9 rounded-xl bg-white text-[#0a0a12] flex items-center justify-center font-bold">
              {name ? name[0].toUpperCase() : "?"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[560px] w-full mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {/* hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 p-[1.5px] shadow-2xl shadow-violet-600/20">
          <div className="rounded-[26px] bg-gradient-to-br from-[#1a1b3a] to-[#0f1120] p-6 sm:p-7 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-[40px]" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-[30px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-bold tracking-widest uppercase">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live • Pair by code
              </div>
              <h1 className="mt-4 font-[family-name:var(--font-fredoka)] text-[34px] sm:text-[42px] font-bold leading-[0.9] tracking-tight">
                Drop. <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Connect.</span>
                <br /> Vibe.
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] leading-6 text-white/70 max-w-[36ch]">
                Mobile-first Connect 4. Create a room, share the 4-letter code, play instantly. Or pass & play on one phone.
              </p>

              {/* mini board preview */}
              <div className="mt-6 flex items-center gap-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
                      className={`h-8 w-8 rounded-full border border-white/20 shadow-lg ${i % 2 === 0 ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-amber-300 to-yellow-500"}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold tracking-[0.12em] text-white/50 uppercase">First to 4 wins</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* mode cards */}
        <div className="mt-6 grid gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link
              href="/play/online"
              onClick={(e) => guardNav("/play/online", e)}
              className="group relative flex items-center gap-4 rounded-[22px] bg-white text-[#0a0a12] p-4 sm:p-5 shadow-xl overflow-hidden active:scale-[0.985] transition"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 via-fuchsia-500/0 to-indigo-500/0 group-hover:from-violet-600/[0.08] group-hover:to-fuchsia-500/[0.08] transition" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xl shadow-lg shrink-0">🌐</div>
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-fredoka)] font-bold text-[17px] leading-none">Play Online</div>
                <div className="text-sm text-black/60 leading-tight mt-1">Create or join with a 4-letter code</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition">→</div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Link
              href="/play/local"
              onClick={(e) => guardNav("/play/local", e)}
              className="group flex items-center gap-4 rounded-[22px] bg-[#1a1d3a] border border-white/10 p-4 sm:p-5 active:scale-[0.985] transition"
            >
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xl shrink-0">📱</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[17px] leading-none">Pass & Play</div>
                <div className="text-sm text-white/60 leading-tight mt-1">Offline • Same phone • Hot seat</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0">→</div>
            </Link>
          </motion.div>
        </div>

        {/* how it works */}
        <div className="mt-6 rounded-[22px] bg-white/[0.06] border border-white/10 p-4 sm:p-5 backdrop-blur">
          <div className="text-xs font-bold tracking-[0.14em] text-white/50 uppercase">How pairing works</div>
          <ol className="mt-3 grid gap-2.5">
            {[
              { n: "1", t: "Create room", d: "Get a 4-letter code instantly" },
              { n: "2", t: "Share code", d: "Send to a friend on any device" },
              { n: "3", t: "Play", d: "Real-time turns • Rematch • Confetti" },
            ].map((s) => (
              <li key={s.n} className="flex gap-3 items-center">
                <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-sm font-black shrink-0">{s.n}</span>
                <div>
                  <div className="text-sm font-bold leading-none">{s.t}</div>
                  <div className="text-xs text-white/60">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* stats / qol */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { k: "Tap", v: "Large cols" },
            { k: "Haptics", v: "Vibration" },
            { k: "Sounds", v: muted ? "Muted" : "On" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 text-center">
              <div className="text-[11px] tracking-widest font-bold text-white/40 uppercase">{s.k}</div>
              <div className="text-sm font-semibold">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-white/30 pb-2">
          Built for Vercel • No login • Codes expire in 4 hours • Works on mobile
        </div>
      </div>

      <NameModal open={showNameModal} onSave={handleSaveName} initialName={name} onClose={name ? () => setShowNameModal(false) : undefined} />
    </main>
  );
}
