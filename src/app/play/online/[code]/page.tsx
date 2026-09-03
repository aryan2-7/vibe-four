"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import GameBoard from "@/components/Board";
import NameModal from "@/components/NameModal";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { sfxDrop, sfxWin, sfxClick, sfxError, triggerHaptic } from "@/lib/sounds";
import type { Room } from "@/lib/roomStore";

type FetchRoom = Room & { yourPlayerNumber?: 1 | 2 | null; opponentLeft?: boolean; opponentDisconnected?: boolean };

export default function OnlineGamePage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toString().toUpperCase();
  const router = useRouter();

  const [room, setRoom] = useState<FetchRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const lastWinRef = useRef<string | null>(null);
  const [leftNotice, setLeftNotice] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pendingName, setPendingName] = useState("");

  // derived token helper
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem(`vibe-four:token:${code}`) || "" : "");
  const getName = () => (typeof window !== "undefined" ? (localStorage.getItem("vibe-four:name") || "").trim() : "");

  useEffect(() => {
    const m = localStorage.getItem("vibe-four:muted") === "1";
    setMuted(m);
    const n = getName();
    setPendingName(n);
  }, []);

  const fetchRoom = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return; // pause when hidden
    try {
      const tok = getToken();
      const res = await fetch(`/api/room/${code}?token=${encodeURIComponent(tok)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 410 || data.deleted) {
        setError("Room closed");
        setLeftNotice(true);
        setRoom(null);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Room not found");
      const r = data.room as FetchRoom;
      // detect leave after you left vs opponent left
      if (data.left) {
        setLeftNotice(true);
      }
      setRoom(r);
      setError("");
      if (r.winner && r.winner !== "draw" && lastWinRef.current !== r.code + String(r.winner)) {
        lastWinRef.current = r.code + String(r.winner);
        const storedMuted = localStorage.getItem("vibe-four:muted") === "1";
        sfxWin(storedMuted);
        triggerHaptic([20, 40, 20, 50]);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.72 }, colors: r.winner === 1 ? ["#dc2626", "#d9a441"] : ["#5cc87a", "#d9a441"] });
      }
      if (r.opponentLeft || r.opponentDisconnected) {
        // subtle haptic once
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Room not found")) {
        setError("Room not found");
      }
    } finally {
      setLoading(false);
    }
  }, [code]);

  // polling with visibility + heartbeat
  useEffect(() => {
    fetchRoom();
    const id = setInterval(fetchRoom, 1400);
    const hb = setInterval(async () => {
      const tok = getToken();
      if (!tok || document.hidden) return;
      try { await fetch(`/api/room/${code}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok }) }); } catch {}
    }, 4500);

    const onVis = () => { if (!document.hidden) fetchRoom(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); clearInterval(hb); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchRoom, code]);

  // auto-join via link: if visitor opens /play/online/CODE without token, prompt name and join
  const doJoin = useCallback(async (name: string) => {
    if (joining) return;
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) { setShowNameModal(true); return; }
    setJoining(true);
    setError("");
    try {
      const playerId = localStorage.getItem("vibe-four:playerId") || crypto.randomUUID();
      localStorage.setItem("vibe-four:playerId", playerId);
      localStorage.setItem("vibe-four:name", trimmed);
      setPendingName(trimmed);
      const existing = getToken();
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, playerName: trimmed, playerId, token: existing || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Join failed");
      localStorage.setItem(`vibe-four:token:${data.code}`, data.token);
      setShowNameModal(false);
      await fetchRoom();
      sfxClick(localStorage.getItem("vibe-four:muted") === "1");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Join failed");
      sfxError(localStorage.getItem("vibe-four:muted") === "1");
    } finally {
      setJoining(false);
    }
  }, [code, joining, fetchRoom]);

  useEffect(() => {
    if (loading || !room || joining) return;
    if (room.yourPlayerNumber != null) return; // already in room
    if (room.players.length >= 2) return; // full
    if (leftNotice) return;
    const tok = getToken();
    if (tok) return; // has token but not recognized? Might be stale, allow rejoin attempt
    const name = getName();
    if (!name) {
      setShowNameModal(true);
      return;
    }
    // auto-join silently
    doJoin(name);
  }, [room, loading, joining, leftNotice, doJoin]);

  // beacon on unload / leave
  const sendLeaveBeacon = useCallback(() => {
    const tok = getToken();
    if (!tok) return;
    const url = `/api/room/${code}/leave?token=${encodeURIComponent(tok)}`;
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ token: tok })], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok }) });
      }
    } catch {}
  }, [code]);

  useEffect(() => {
    const onBeforeUnload = () => sendLeaveBeacon();
    const onPageHide = () => sendLeaveBeacon();
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [sendLeaveBeacon]);

  async function handleColumn(col: number) {
    if (!room || moveLoading) return;
    const tok = getToken();
    if (!tok) { setError("Session missing, rejoin"); return; }
    if (room.status !== "playing" || room.winner) return;
    if (room.opponentLeft) { setError("Opponent left"); return; }
    if (room.yourPlayerNumber !== room.currentPlayer) { sfxError(muted); triggerHaptic([10, 30, 10]); return; }
    setMoveLoading(true);
    try {
      const res = await fetch(`/api/room/${code}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok, col }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Move failed");
      setRoom({ ...data.room, yourPlayerNumber: room.yourPlayerNumber } as FetchRoom);
      if (typeof data.row === "number") setLastMove({ row: data.row, col });
      sfxDrop(muted); triggerHaptic(16);
      if (data.room.winner && data.room.winner !== "draw") { sfxWin(muted); confetti({ particleCount: 70, spread: 70, origin: { y: 0.68 } }); }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Move failed"); sfxError(muted);
    } finally { setMoveLoading(false); }
  }

  async function handleRematch() {
    const tok = getToken(); sfxClick(muted);
    try {
      const res = await fetch(`/api/room/${code}/rematch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.room as FetchRoom); setLastMove(null); lastWinRef.current = null;
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Rematch failed"); }
  }

  async function handleLeave() {
    const tok = getToken();
    sfxClick(muted);
    try { await fetch(`/api/room/${code}/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok }), keepalive: true }); } catch {}
    localStorage.removeItem(`vibe-four:token:${code}`);
    router.push("/play/online");
  }

  function copyCode() {
    navigator.clipboard.writeText(code); setCopied(true); sfxClick(muted); triggerHaptic(10); setTimeout(() => setCopied(false), 1200);
  }
  function copyLink() {
    const url = `${window.location.origin}/play/online/${code}`;
    navigator.clipboard.writeText(url); setCopied(true); sfxClick(muted); setTimeout(() => setCopied(false), 1200);
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-[#1e150e]/15 border-t-[#1e150e] animate-spin" />
          <p className="mt-3 text-sm text-[#8c7a60]">Loading {code}…</p>
        </div>
      </div>
    );
  }

  if ((error && !room) || leftNotice && !room) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <div className="rounded-[16px] bg-white border border-[#1e150e]/10 p-6 max-w-sm w-full">
          <h2 className="font-[family-name:var(--font-fraunces)] font-bold text-lg">{leftNotice ? "Room closed" : "Room not found"}</h2>
          <p className="text-sm text-[#8c7a60] mt-1">{error || "This game was removed after everyone left."}</p>
          <Link href="/play/online" className="mt-4 inline-flex rounded-full bg-[#1e150e] text-[#fdf8ec] px-5 py-2.5 text-sm font-semibold">Back to lobby</Link>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const me = room.yourPlayerNumber;
  const isMyTurn = room.currentPlayer === me && room.status === "playing" && !room.opponentLeft && !room.opponentDisconnected;
  const opponent = room.players[me === 1 ? 1 : 0];
  const waiting = room.status === "waiting";
  const finished = room.status === "finished";
  const abandoned = room.status === "abandoned" || !!room.opponentLeft;
  const disconnected = !!room.opponentDisconnected && !abandoned && !finished;
  const iWon = finished && room.winner === me;
  const isDraw = finished && room.winner === "draw";

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-[10px] bg-[#fdf8ec]/85 border-b border-[#1e150e]/8">
        <div className="max-w-[580px] mx-auto w-full px-4 py-2.5 flex items-center justify-between gap-2">
          <Link href="/play/online" onClick={handleLeave} className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center">←</Link>
          <button onClick={copyCode} className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#1e150e] text-[#fdf8ec] px-3 py-2 font-bold tracking-[0.18em] text-sm">
            {code} <span className="text-xs font-medium tracking-normal bg-white/15 rounded-full px-2 py-0.5">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button onClick={() => { const nv = !muted; setMuted(nv); localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); }} className="h-8 w-8 rounded-full bg-white border border-[#1e150e]/10 flex items-center justify-center text-sm">{muted ? "·" : "♪"}</button>
        </div>
      </header>

      <div className="flex-1 max-w-[580px] w-full mx-auto px-4 py-4 flex flex-col">
        {/* players + scores */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {[0, 1].map((idx) => {
            const p = room.players[idx];
            const num = (idx + 1) as 1 | 2;
            const isMe = num === me;
            const isActive = room.currentPlayer === num && !finished && !abandoned && !waiting;
            const isWinner = finished && room.winner === num;
            const isLeft = abandoned && !p;
            const wins = num === 1 ? room.scores?.p1 ?? 0 : room.scores?.p2 ?? 0;
            return (
              <div key={idx} className={`rounded-[14px] border px-3 py-2.5 flex items-center gap-2.5 ${isMe ? "bg-white border-[#1e150e]/15" : "bg-white/70 border-[#1e150e]/10"} ${isWinner ? "ring-1 ring-[#1e150e]" : ""} ${isActive ? "shadow-sm" : ""}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${num === 1 ? "bg-[#dc2626]" : "bg-[#5cc87a]"}`}>{num}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold leading-none truncate flex items-center gap-1">
                    {p ? p.name : isLeft || (waiting && idx === 1) ? <span className="text-[#8c7a60] italic">{abandoned ? "Left" : "Waiting…"}</span> : "—"}
                    {isMe && <span className="text-[10px] leading-none bg-[#1e150e] text-white rounded-full px-1.5 py-0.5">YOU</span>}
                  </div>
                  <div className="text-xs text-[#8c7a60] truncate tabular-nums">
                    {isLeft ? "Left game" : isWinner ? "Winner" : `${wins} win${wins !== 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-widest text-[#8c7a60]">VS</div>
            <div className="text-[11px] text-[#8c7a60] tabular-nums">{room.scores?.draws ? `${room.scores.draws} draw${room.scores.draws !== 1 ? "s" : ""}` : ""}</div>
          </div>
        </div>
        {joining && <div className="mt-3 text-center text-xs text-[#8c7a60] flex items-center justify-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-[#1e150e]/20 border-t-[#1e150e] animate-spin" /> Joining…</div>}

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {abandoned ? (
              <motion.div key="abandoned" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-[14px] bg-[#dc2626]/10 border border-[#dc2626]/15 px-4 py-3 text-center">
                <div className="text-sm font-semibold text-[#7f1d1d]">Opponent left</div>
                <div className="text-xs text-[#8c7a60] mt-0.5">They’ve been removed from this room. The room will be deleted when you leave.</div>
                <div className="mt-3 flex gap-2 justify-center">
                  <Link href="/play/online" onClick={handleLeave} className="rounded-full bg-[#1e150e] text-white px-4 py-2 text-sm font-semibold">Leave</Link>
                  <button onClick={copyLink} className="rounded-full bg-white border border-[#1e150e]/10 px-4 py-2 text-sm font-medium">Invite someone else</button>
                </div>
              </motion.div>
            ) : disconnected ? (
              <motion.div key="disc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[14px] bg-amber-50 border border-amber-200 px-4 py-3 text-center">
                <div className="text-sm font-semibold text-amber-900">Opponent disconnected</div>
                <div className="text-xs text-amber-700 mt-0.5">Reconnecting… if they don’t return in a few seconds, you can leave.</div>
              </motion.div>
            ) : waiting ? (
              <motion.div key="waiting" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-[14px] bg-white border border-[#1e150e]/10 px-4 py-3 text-center">
                <div className="text-sm font-semibold">Waiting for opponent</div>
                <div className="text-xs text-[#8c7a60] mt-1">Share code <span className="font-mono font-bold text-[#1e150e]">{code}</span> or send link</div>
                <div className="mt-3 flex gap-2 justify-center">
                  <button onClick={copyCode} className="rounded-full bg-[#1e150e] text-white px-4 py-2 text-sm font-semibold">Copy code</button>
                  <button onClick={copyLink} className="rounded-full bg-white border border-[#1e150e]/10 px-4 py-2 text-sm font-medium">Copy link</button>
                </div>
              </motion.div>
            ) : finished ? (
              <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-[14px] px-4 py-3 text-center border font-semibold ${isDraw ? "bg-white border-[#1e150e]/10" : iWon ? "bg-[#5cc87a]/10 border-[#5cc87a]/15 text-[#14532d]" : "bg-[#fdf8ec] border-[#1e150e]/10"}`}>
                {isDraw ? "Draw." : iWon ? "You win." : `${opponent?.name || "Opponent"} wins.`}
                <div className="mt-2 flex gap-2 justify-center font-medium">
                  <button onClick={handleRematch} className="rounded-full bg-[#1e150e] text-white px-5 py-2 text-sm font-semibold">{room.rematchRequests.includes(getToken()) ? "Waiting…" : "Rematch"}</button>
                  <Link href="/play/online" className="rounded-full bg-white border border-[#1e150e]/10 px-5 py-2 text-sm">Lobby</Link>
                </div>
                {room.rematchRequests.length > 0 && room.rematchRequests.length < 2 && <div className="mt-2 text-xs font-normal text-[#8c7a60]">{room.rematchRequests.length}/2 requested</div>}
              </motion.div>
            ) : (
              <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-full mx-auto w-fit px-4 py-1.5 text-sm font-medium border flex items-center gap-2 ${isMyTurn ? "bg-[#5cc87a]/10 border-[#5cc87a]/15 text-[#14532d]" : "bg-white border-[#1e150e]/10 text-[#8c7a60]"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isMyTurn ? "bg-[#5cc87a]" : "bg-[#8c7a60]"}`} />
                {isMyTurn ? "Your turn" : `${room.players[room.currentPlayer - 1]?.name || "Opponent"}’s turn`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <div className="mt-3 rounded-[12px] bg-[#dc2626]/10 border border-[#dc2626]/15 px-4 py-2.5 text-sm text-[#7f1d1d]">{error}</div>}

        <div className="mt-4">
          <GameBoard board={room.board} currentPlayer={room.currentPlayer} winningLine={room.winningLine || []} onColumnClick={handleColumn} disabled={!isMyTurn || !!finished || !!abandoned || waiting || moveLoading} lastMove={lastMove} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={fetchRoom} className="rounded-full bg-white border border-[#1e150e]/10 px-3.5 py-1.5 text-xs font-medium">Refresh</button>
          <span className="text-xs text-[#8c7a60] tabular-nums">{room.moveCount} moves · {room.status} · {room.scores ? `${room.scores.p1}-${room.scores.p2}` : ""}</span>
          <button onClick={handleLeave} className="rounded-full bg-[#1e150e] text-[#fdf8ec] px-3.5 py-1.5 text-xs font-semibold">Leave</button>
        </div>
      </div>
      <NameModal
        open={showNameModal}
        initialName={pendingName}
        onClose={() => setShowNameModal(false)}
        onSave={(n) => {
          setPendingName(n);
          setShowNameModal(false);
          doJoin(n);
        }}
      />
    </main>
  );
}
