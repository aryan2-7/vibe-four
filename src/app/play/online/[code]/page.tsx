"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import GameBoard from "@/components/Board";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { sfxDrop, sfxWin, sfxClick, sfxError, triggerHaptic } from "@/lib/sounds";
import type { Room } from "@/lib/roomStore";

type FetchRoom = Room & { yourPlayerNumber?: 1 | 2 | null };

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

  const token = typeof window !== "undefined" ? localStorage.getItem(`vibe-four:token:${code}`) || "" : "";
  const name = typeof window !== "undefined" ? localStorage.getItem("vibe-four:name") || "Player" : "Player";

  useEffect(() => {
    const m = localStorage.getItem("vibe-four:muted") === "1";
    setMuted(m);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const tok = localStorage.getItem(`vibe-four:token:${code}`) || "";
      const res = await fetch(`/api/room/${code}?token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room not found");
      const r = data.room as FetchRoom;
      setRoom(r);
      setError("");
      // detect win to trigger confetti once
      if (r.winner && r.winner !== "draw" && lastWinRef.current !== r.code + String(r.winner)) {
        lastWinRef.current = r.code + String(r.winner);
        // check if we just updated boardNetwork: play sfx if winner known
        const storedMuted = localStorage.getItem("vibe-four:muted") === "1";
        sfxWin(storedMuted);
        triggerHaptic([20, 40, 20, 50]);
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 }, colors: r.winner === 1 ? ["#ef4444", "#f97316"] : ["#facc15", "#f59e0b"] });
      }
      // detect new move for drop sfx/haptic: compare moveCount? We'll just track lastMove via board diff is hard, but we can play drop when moveCount increases
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchRoom();
    const id = setInterval(fetchRoom, 1000);
    return () => clearInterval(id);
  }, [fetchRoom]);

  // track moveCount to find last move position for animation
  const prevMoveCountRef = useRef<number>(0);
  useEffect(() => {
    if (!room) return;
    if (room.moveCount > prevMoveCountRef.current) {
      // find first differing cell from previous? Simpler: find last placed disc = topmost in column that changed? We don't have previous board.
      // Instead, derive lastMove by scanning board for most recent? We can store last move via API move response, but polling doesn't give it.
      // Heuristic: the disc that made moveCount increase is the highest occupied in the column that has change. Instead we skip precise animation and just not set lastMove for poll.
    }
    prevMoveCountRef.current = room.moveCount;
  }, [room]);

  async function handleColumn(col: number) {
    if (!room || moveLoading) return;
    const tok = localStorage.getItem(`vibe-four:token:${code}`) || "";
    if (!tok) { setError("Missing session, rejoin room"); return; }
    if (room.status !== "playing" || room.winner) return;
    if (room.yourPlayerNumber !== room.currentPlayer) { sfxError(muted); triggerHaptic([10, 30, 10]); return; }

    setMoveLoading(true);
    try {
      const res = await fetch(`/api/room/${code}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok, col }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Move failed");
      setRoom({ ...data.room, yourPlayerNumber: room.yourPlayerNumber } as FetchRoom);
      if (typeof data.row === "number") setLastMove({ row: data.row, col });
      sfxDrop(muted);
      triggerHaptic(18);
      // winner handled in fetchRoom next poll but also directly
      if (data.room.winner && data.room.winner !== "draw") {
        sfxWin(muted);
        triggerHaptic([20, 40, 20]);
        confetti({ particleCount: 110, spread: 85, origin: { y: 0.65 } });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Move failed";
      setError(msg);
      sfxError(muted);
    } finally {
      setMoveLoading(false);
    }
  }

  async function handleRematch() {
    const tok = localStorage.getItem(`vibe-four:token:${code}`) || "";
    sfxClick(muted);
    try {
      const res = await fetch(`/api/room/${code}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.room as FetchRoom);
      setLastMove(null);
      lastWinRef.current = null;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rematch failed");
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    sfxClick(muted);
    triggerHaptic(10);
    setTimeout(() => setCopied(false), 1400);
  }

  function copyLink() {
    const url = `${window.location.origin}/play/online/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    sfxClick(muted);
    setTimeout(() => setCopied(false), 1400);
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="mt-4 text-sm text-white/60">Loading room {code}…</p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <div className="rounded-[22px] bg-white/[0.07] border border-white/10 p-6 max-w-sm w-full">
          <div className="text-3xl">😕</div>
          <h2 className="mt-3 font-bold">Room not found</h2>
          <p className="text-sm text-white/60 mt-1">{error}</p>
          <Link href="/play/online" className="mt-4 inline-flex rounded-full bg-white text-black px-5 py-2.5 font-bold">Back to lobby</Link>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const me = room.yourPlayerNumber;
  const isMyTurn = room.currentPlayer === me && room.status === "playing";
  const opponent = room.players[me === 1 ? 1 : 0];
  const mePlayer = me ? room.players[me - 1] : null;
  const waiting = room.status === "waiting";
  const finished = room.status === "finished";
  const iWon = finished && room.winner === me;
  const iLost = finished && room.winner && room.winner !== "draw" && room.winner !== me;
  const isDraw = finished && room.winner === "draw";

  // For board, currentPlayer is room.currentPlayer
  const myPlayerForBoard = me;

  return (
    <main className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a12]/70 border-b border-white/10">
        <div className="max-w-[560px] mx-auto w-full px-4 py-2.5 flex items-center justify-between gap-2">
          <Link href="/play/online" className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">←</Link>
          <button onClick={copyCode} className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white text-[#0a0a12] px-3 py-2 font-black tracking-[0.18em] text-sm active:scale-95 transition">
            {code} <span className="text-xs font-bold tracking-normal bg-black/10 rounded-full px-2 py-0.5">{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button onClick={() => { const nv = !muted; setMuted(nv); localStorage.setItem("vibe-four:muted", nv ? "1" : "0"); }} className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-[560px] w-full mx-auto px-4 py-5 flex flex-col">
        {/* players */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {[0, 1].map((idx) => {
            const p = room.players[idx];
            const num = (idx + 1) as 1 | 2;
            const isMe = num === me;
            const isActive = room.currentPlayer === num && !finished && !waiting;
            const isWinner = finished && room.winner === num;
            return (
              <div key={idx} className={`rounded-[18px] p-[1.5px] ${isActive ? "bg-gradient-to-br from-white/30 to-white/5" : "bg-white/10"} ${isWinner ? "ring-2 ring-white/50" : ""}`}>
                <div className={`rounded-[16px] px-3 py-3 flex items-center gap-2.5 ${isMe ? "bg-[#1e2250]" : "bg-[#141735]"} `}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 ${num === 1 ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-amber-300 to-yellow-500"}`}>
                    {num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold leading-none truncate flex items-center gap-1">
                      {p ? p.name : waiting && idx === 1 ? "Waiting…" : "—"}
                      {isMe && <span className="text-[10px] leading-none bg-white text-black rounded-full px-1.5 py-0.5 font-black">YOU</span>}
                    </div>
                    <div className="text-xs text-white/50 truncate">{isActive ? "● Turn" : isWinner ? "👑 Winner" : p ? "● In room" : "Share code"}</div>
                  </div>
                  {isWinner && <span>🏆</span>}
                </div>
              </div>
            );
          })}
          <div className="text-[11px] font-black tracking-widest text-white/30">VS</div>
        </div>

        {/* status banner */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            {waiting ? (
              <motion.div key="waiting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-amber-400/10 border border-amber-400/20 px-4 py-3 text-center">
                <div className="text-sm font-bold text-amber-200">Waiting for opponent…</div>
                <div className="text-xs text-white/60 mt-1">Share code <span className="font-mono font-bold text-white">{code}</span> or link</div>
                <div className="mt-3 flex gap-2 justify-center">
                  <button onClick={copyCode} className="rounded-full bg-white text-black px-4 py-2 text-sm font-bold">Copy code</button>
                  <button onClick={copyLink} className="rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-bold">Copy link</button>
                </div>
              </motion.div>
            ) : finished ? (
              <motion.div
                key="finished"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`rounded-2xl px-4 py-3 text-center border font-bold ${isDraw ? "bg-white/10 border-white/15 text-white" : iWon ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200" : iLost ? "bg-red-500/15 border-red-500/30 text-red-200" : "bg-white/10 border-white/15"}`}
              >
                {isDraw ? "Draw! 🤝 Great game." : iWon ? "You won! 🎉" : iLost ? `${opponent?.name || "Opponent"} won` : "Game over"}
                <div className="mt-2 flex gap-2 justify-center">
                  <button onClick={handleRematch} className="rounded-full bg-white text-black px-5 py-2.5 text-sm font-black active:scale-95 transition">
                    {room.rematchRequests.includes(token) ? "Waiting…" : "Rematch"}
                  </button>
                  <Link href="/play/online" className="rounded-full bg-white/10 border border-white/15 px-5 py-2.5 text-sm font-bold">Lobby</Link>
                </div>
                {room.rematchRequests.length > 0 && room.rematchRequests.length < 2 && <div className="mt-2 text-xs font-normal text-white/60">{room.rematchRequests.length}/2 requested</div>}
              </motion.div>
            ) : (
              <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-full mx-auto w-fit px-4 py-2 text-sm font-bold border flex items-center gap-2 ${isMyTurn ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200" : "bg-white/10 border-white/10 text-white/70"}`}>
                <span className={`h-2 w-2 rounded-full ${isMyTurn ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
                {isMyTurn ? "Your turn — tap a column" : `${room.players[room.currentPlayer - 1]?.name || "Opponent"}'s turn`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <div className="mt-3 rounded-2xl bg-red-500/15 border border-red-500/30 px-4 py-2.5 text-sm text-red-200">{error}</div>}

        <div className="mt-5">
          <GameBoard
            board={room.board}
            currentPlayer={room.currentPlayer}
            winningLine={room.winningLine || []}
            onColumnClick={handleColumn}
            disabled={!isMyTurn || !!finished || waiting || moveLoading}
            lastMove={lastMove}
            myPlayer={myPlayerForBoard}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={fetchRoom} className="rounded-full bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold active:scale-95 transition">↻ Refresh</button>
          <div className="text-xs text-white/40 font-mono">Moves: {room.moveCount} • {room.status}</div>
          <button onClick={() => { localStorage.removeItem(`vibe-four:token:${code}`); router.push("/play/online"); }} className="rounded-full bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold">Leave</button>
        </div>

        <div className="mt-6 text-center text-xs text-white/25">Polls every 1s • Keep tab open • Share code {code}</div>
      </div>
    </main>
  );
}
