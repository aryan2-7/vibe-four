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
    setName(n); setMuted(m);
    if (!n) setShowNameModal(true);
  }, []);

  async function handleCreate() {
    if (!name.trim()) { setShowNameModal(true); return; }
    setLoading("create"); setError(""); sfxClick(muted);
    try {
      const playerId = localStorage.getItem("vibe-four:playerId") || crypto.randomUUID();
      localStorage.setItem("vibe-four:playerId", playerId);
      const res = await fetch("/api/room/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerName: name, playerId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      localStorage.setItem(`vibe-four:token:${data.code}`, data.token);
      router.push(`/play/online/${data.code}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); sfxError(muted); } finally { setLoading(null); }
  }

  async function handleJoin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) { setShowNameModal(true); return; }
    const clean = code.toUpperCase().trim();
    if (clean.length !== 4) { setError("Enter 4-letter code"); sfxError(muted); return; }
    setLoading("join"); setError(""); sfxClick(muted);
    try {
      const playerId = localStorage.getItem("vibe-four:playerId") || crypto.randomUUID();
      localStorage.setItem("vibe-four:playerId", playerId);
      const existingToken = localStorage.getItem(`vibe-four:token:${clean}`) || undefined;
      const res = await fetch("/api/room/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: clean, playerName: name, playerId, token: existingToken }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Join failed");
      localStorage.setItem(`vibe-four:token:${data.code}`, data.token);
      router.push(`/play/online/${data.code}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); sfxError(muted); } finally { setLoading(null); }
  }

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-[10px] bg-[#fdf8ec]/85 border-b border-[#1e150e]/8">
        <div className="max-w-[580px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <Link href="/" className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center">←</Link>
          <div className="font-[family-name:var(--font-fraunces)] font-bold">Online</div>
          <button onClick={() => { const nv = !muted; setMuted(nv); localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); }} className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center text-sm">{muted ? "·" : "♪"}</button>
        </div>
      </header>

      <div className="flex-1 max-w-[580px] w-full mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="rounded-[16px] bg-white border border-[#1e150e]/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#1e150e] text-white flex items-center justify-center text-xs font-bold">{name ? name[0].toUpperCase() : "?"}</div>
            <div className="text-sm"><span className="text-[#8c7a60]">Playing as</span> <span className="font-semibold">{name || "—"}</span></div>
          </div>
          <button onClick={() => setShowNameModal(true)} className="rounded-full bg-[#1e150e] text-[#fdf8ec] px-3.5 py-1.5 text-sm font-medium">Edit</button>
        </div>

        <div className="rounded-[16px] bg-white border border-[#1e150e]/10 p-5">
          <h2 className="font-[family-name:var(--font-fraunces)] font-bold text-[18px] leading-none">Create a room</h2>
          <p className="text-sm text-[#8c7a60] mt-1">You’ll get a 4-letter code to share.</p>
          <button onClick={handleCreate} disabled={!!loading} className="mt-4 w-full rounded-full py-3.5 bg-[#1e150e] text-[#fdf8ec] font-semibold disabled:opacity-60 active:scale-[0.99] flex items-center justify-center gap-2">
            {loading === "create" ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</> : "Create room"}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold tracking-widest uppercase text-[#8c7a60]">
          <span className="h-px flex-1 bg-[#1e150e]/10" /> or join <span className="h-px flex-1 bg-[#1e150e]/10" />
        </div>

        <form onSubmit={handleJoin} className="rounded-[16px] bg-white border border-[#1e150e]/10 p-5">
          <label className="text-xs font-semibold tracking-wide uppercase text-[#8c7a60]">Room code</label>
          <div className="mt-2 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))} placeholder="AB12" maxLength={4} inputMode="text" autoCapitalize="characters" className="flex-1 rounded-full bg-[#fdf8ec] border border-[#1e150e]/10 px-4 py-3.5 text-center text-[18px] font-bold tracking-[0.22em] placeholder:text-[#8c7a60]/40 focus:border-[#1e150e]/20 outline-none" />
            <button type="submit" disabled={!!loading || code.length !== 4} className="rounded-full px-6 bg-[#1e150e] text-[#fdf8ec] font-semibold disabled:opacity-40 active:scale-95">Join</button>
          </div>
        </form>

        {error && <div className="rounded-[12px] bg-[#dc2626]/10 border border-[#dc2626]/20 px-4 py-3 text-sm text-[#7f1d1d]">{error}</div>}
      </div>

      <NameModal open={showNameModal} onSave={(n) => { setName(n); localStorage.setItem("vibe-four:name", n); setShowNameModal(false); }} initialName={name} onClose={name ? () => setShowNameModal(false) : undefined} />
    </main>
  );
}
