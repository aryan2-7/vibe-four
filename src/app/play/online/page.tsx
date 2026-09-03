"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NameModal from "@/components/NameModal";
import { sfxClick, sfxError } from "@/lib/sounds";

export default function OnlineLobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [muted, setMuted] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);

  useEffect(() => {
    const n = localStorage.getItem("vibe-four:name") || "";
    const m = localStorage.getItem("vibe-four:muted") === "1";
    setName(n);
    setMuted(m);
    if (!n) setShowNameModal(true);
  }, []);

  async function handleCreate() {
    if (!name.trim()) { setShowNameModal(true); return; }
    setLoading("create");
    setError("");
    sfxClick(muted);
    try {
      const playerId = localStorage.getItem("vibe-four:playerId") || crypto.randomUUID();
      localStorage.setItem("vibe-four:playerId", playerId);
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name, playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      localStorage.setItem(`vibe-four:token:${data.code}`, data.token);
      router.push(`/play/online/${data.code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      sfxError(muted);
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) { setShowNameModal(true); return; }
    const clean = code.toUpperCase().trim();
    if (clean.length !== 4) { setError("Enter 4-letter code"); sfxError(muted); return; }
    setLoading("join");
    setError("");
    sfxClick(muted);
    try {
      const playerId = localStorage.getItem("vibe-four:playerId") || crypto.randomUUID();
      localStorage.setItem("vibe-four:playerId", playerId);
      const existingToken = localStorage.getItem(`vibe-four:token:${clean}`) || undefined;
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, playerName: name, playerId, token: existingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Join failed");
      localStorage.setItem(`vibe-four:token:${data.code}`, data.token);
      router.push(`/play/online/${data.code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      sfxError(muted);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a12]/70 border-b border-white/10">
        <div className="max-w-[560px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <Link href="/" className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">←</Link>
          <div className="font-[family-name:var(--font-fredoka)] font-bold tracking-wide">ONLINE</div>
          <button onClick={() => { const nv = !muted; setMuted(nv); localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); }} className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-[560px] w-full mx-auto px-4 py-6 flex flex-col gap-5">
        {/* name card */}
        <div className="rounded-[22px] bg-white/[0.07] border border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center font-black">{name ? name[0].toUpperCase() : "?"}</div>
            <div>
              <div className="text-xs tracking-widest font-bold text-white/50 uppercase">Playing as</div>
              <div className="font-bold leading-none">{name || "— set your name —"}</div>
            </div>
          </div>
          <button onClick={() => setShowNameModal(true)} className="rounded-full bg-white text-[#0a0a12] px-4 py-2 text-sm font-bold active:scale-95 transition">Edit</button>
        </div>

        <div className="rounded-[24px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600 p-[1.5px]">
          <div className="rounded-[22px] bg-[#151632] p-5">
            <h2 className="font-[family-name:var(--font-fredoka)] font-bold text-lg leading-none flex items-center gap-2">🌐 Create a room</h2>
            <p className="text-sm text-white/60 mt-1">Get a 4-letter code to share with your friend</p>
            <button
              onClick={handleCreate}
              disabled={!!loading}
              className="mt-4 w-full rounded-2xl py-4 bg-white text-[#0a0a12] font-black text-[15px] shadow-lg disabled:opacity-60 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              {loading === "create" ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" /> Creating…
                </>
              ) : (
                "Create room + get code"
              )}
            </button>
            <p className="mt-2 text-center text-xs text-white/40">Code expires in 4 hours • No sign-up needed</p>
          </div>
        </div>

        <div className="relative flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-bold tracking-[0.16em] text-white/30 uppercase">Or join with code</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleJoin} className="rounded-[22px] bg-white/[0.07] border border-white/10 p-5">
          <label className="text-xs font-bold tracking-[0.14em] text-white/60 uppercase">Room code</label>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
              placeholder="AB12"
              maxLength={4}
              inputMode="text"
              autoCapitalize="characters"
              className="flex-1 rounded-2xl bg-[#0f1120] border border-white/10 px-4 py-4 text-center text-[22px] font-black tracking-[0.28em] placeholder:text-white/20 focus:border-violet-500 outline-none"
            />
            <button
              type="submit"
              disabled={!!loading || code.length !== 4}
              className="rounded-2xl px-6 bg-gradient-to-br from-violet-600 to-fuchsia-600 font-bold shadow-lg shadow-violet-600/20 disabled:opacity-40 active:scale-95 transition"
            >
              {loading === "join" ? "…" : "Join"}
            </button>
          </div>
          <p className="mt-2 text-xs text-white/40">Ask your friend for the 4 letters shown at the top of their screen</p>
        </form>

        {error && <div className="rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
          <div className="text-xs font-bold tracking-widest uppercase text-white/40">Tips for mobile</div>
          <ul className="mt-2 space-y-1.5 text-sm text-white/70 list-disc pl-5">
            <li>Codes are uppercase — share via WhatsApp/iMessage</li>
            <li>Keep tab open — polling every 1s keeps game in sync</li>
            <li>Add to Home Screen for full-screen play on iOS</li>
          </ul>
        </div>
      </div>

      <NameModal open={showNameModal} onSave={(n) => { setName(n); localStorage.setItem("vibe-four:name", n); setShowNameModal(false); }} initialName={name} onClose={name ? () => setShowNameModal(false) : undefined} />
    </main>
  );
}
