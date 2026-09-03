"use client";
import { useEffect, useState } from "react";
import { Board as BoardType, createEmptyBoard, makeMove, checkWinner, Cell } from "@/lib/game";
import GameBoard from "@/components/Board";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { sfxDrop, sfxWin, triggerHaptic } from "@/lib/sounds";

type Props = {
  p1Name: string;
  p2Name: string;
  muted: boolean;
  onScoreChange?: (p1: number, p2: number) => void;
};

export default function LocalGame({ p1Name, p2Name, muted, onScoreChange }: Props) {
  const [board, setBoard] = useState<BoardType>(() => createEmptyBoard());
  const [current, setCurrent] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | "draw" | null>(null);
  const [line, setLine] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0, draws: 0 });
  const [moveHistory, setMoveHistory] = useState<number[]>([]);

  function resetBoard() {
    setBoard(createEmptyBoard());
    setCurrent(winner === 1 ? 2 : winner === 2 ? 1 : current === 1 ? 2 : 1); // alternate starter, but after win loser starts is more fun? We'll alternate
    setWinner(null);
    setLine([]);
    setLastMove(null);
    setMoveHistory([]);
  }

  function handleUndo() {
    if (winner || moveHistory.length === 0) return;
    const lastCol = moveHistory[moveHistory.length - 1];
    // remove topmost disc in that column (find first occupied)
    const newBoard = board.map((r) => [...r]);
    for (let r = 0; r < 6; r++) {
      if (newBoard[r][lastCol] !== 0) {
        newBoard[r][lastCol] = 0;
        break;
      }
    }
    setBoard(newBoard);
    setMoveHistory((h) => h.slice(0, -1));
    setCurrent((c) => (c === 1 ? 2 : 1));
    triggerHaptic(10);
  }

  function handleColumn(col: number) {
    if (winner) return;
    const res = makeMove(board, col, current);
    if (!res) {
      triggerHaptic([10, 30, 10]);
      return;
    }
    const nextBoard = res.board;
    const win = checkWinner(nextBoard);
    setBoard(nextBoard);
    setLastMove({ row: res.row, col });
    setMoveHistory((h) => [...h, col]);
    sfxDrop(muted);
    triggerHaptic(18);

    if (win.winner) {
      setWinner(win.winner);
      setLine(win.line);
      sfxWin(muted);
      triggerHaptic([20, 40, 20, 40, 60]);
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.65 }, colors: win.winner === 1 ? ["#ef4444", "#f97316", "#ffffff"] : ["#facc15", "#f59e0b", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 250);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 350);
      setScores((s) => {
        const ns = win.winner === 1 ? { ...s, p1: s.p1 + 1 } : { ...s, p2: s.p2 + 1 };
        onScoreChange?.(ns.p1, ns.p2);
        return ns;
      });
    } else if (win.isDraw) {
      setWinner("draw");
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      triggerHaptic([30, 30, 30]);
    } else {
      setCurrent((c) => (c === 1 ? 2 : 1));
    }
  }

  const names = { 1: p1Name, 2: p2Name } as const;
  const colors = { 1: "from-red-500 to-orange-500", 2: "from-amber-300 to-yellow-500" } as const;

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pb-8">
      {/* score + player cards */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-5">
        {[1, 2].map((n) => {
          const pn = n as 1 | 2;
          const isActive = current === pn && !winner;
          const isWinner = winner === pn;
          return (
            <motion.div
              key={n}
              animate={{ scale: isActive ? 1.02 : 1 }}
              className={`relative rounded-[22px] p-[1.5px] ${isActive ? "bg-gradient-to-br from-white/20 to-white/5" : "bg-white/10"} ${isWinner ? "ring-2 ring-white/40" : ""}`}
            >
              <div className={`rounded-[20px] px-3 py-3 flex items-center gap-3 ${isActive ? "bg-[#1e2247]/90" : "bg-[#141735]/80"} backdrop-blur`}>
                <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${colors[pn]} flex items-center justify-center text-white font-black shadow-lg shrink-0`}>
                  {pn === 1 ? "●" : "●"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold leading-none truncate flex items-center gap-1.5">
                    {names[pn]}
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  </div>
                  <div className="text-xs text-white/60 font-mono">{pn === 1 ? `Wins: ${scores.p1}` : `Wins: ${scores.p2}`}</div>
                </div>
                {isWinner && <div className="text-lg">👑</div>}
              </div>
              {isActive && <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-gradient-to-r ${colors[pn]} blur-[0.5px]`} />}
            </motion.div>
          );
        })}
        <div className="flex flex-col items-center px-1">
          <div className="text-[10px] tracking-[0.18em] text-white/40 font-bold">VS</div>
          <div className="text-xs font-mono text-white/60">{scores.draws} draws</div>
        </div>
      </div>

      {/* turn banner */}
      <AnimatePresence mode="wait">
        {!winner ? (
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 flex justify-center"
          >
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border ${current === 1 ? "bg-red-500/15 border-red-500/25 text-red-200" : "bg-amber-400/15 border-amber-400/25 text-amber-100"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${current === 1 ? "bg-red-500" : "bg-amber-400"} animate-pulse shadow`} />
              {names[current]}&apos;s turn
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="winner"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mb-4 rounded-2xl p-3 text-center font-bold border ${winner === "draw" ? "bg-white/10 border-white/20 text-white" : winner === 1 ? "bg-red-500/15 border-red-500/30 text-red-200" : "bg-amber-400/15 border-amber-400/30 text-amber-100"}`}
          >
            {winner === "draw" ? "It's a draw! 🤝" : `🎉 ${names[winner]} wins!`}
          </motion.div>
        )}
      </AnimatePresence>

      <GameBoard board={board} currentPlayer={current} winningLine={line} onColumnClick={handleColumn} disabled={!!winner} lastMove={lastMove} />

      {/* controls */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <button
          onClick={handleUndo}
          disabled={!!winner || moveHistory.length === 0}
          className="rounded-2xl py-3.5 bg-white/[0.07] border border-white/10 font-semibold text-sm disabled:opacity-30 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
        >
          ↩︎ Undo
        </button>
        <button
          onClick={resetBoard}
          className="rounded-2xl py-3.5 bg-white text-[#0a0a12] font-bold text-sm shadow-lg active:scale-[0.98] transition"
        >
          {winner ? "Play Again" : "Reset"}
        </button>
        <button
          onClick={() => {
            setBoard(createEmptyBoard());
            setWinner(null);
            setLine([]);
            setLastMove(null);
            setMoveHistory([]);
            setCurrent(1);
            setScores({ p1: 0, p2: 0, draws: 0 });
          }}
          className="rounded-2xl py-3.5 bg-white/[0.07] border border-white/10 font-semibold text-sm active:scale-[0.98] transition"
        >
          Clear Scores
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
        <span className="h-2 w-2 rounded-full bg-emerald-400/60" /> Pass & Play • One phone • Haptics & sounds
      </div>
    </div>
  );
}
