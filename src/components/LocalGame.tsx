"use client";
import { useState } from "react";
import { Board as BoardType, createEmptyBoard, makeMove, checkWinner } from "@/lib/game";
import GameBoard from "@/components/Board";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { sfxDrop, sfxWin, triggerHaptic } from "@/lib/sounds";

type Props = { p1Name: string; p2Name: string; muted: boolean };

export default function LocalGame({ p1Name, p2Name, muted }: Props) {
  const [board, setBoard] = useState<BoardType>(() => createEmptyBoard());
  const [current, setCurrent] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | "draw" | null>(null);
  const [line, setLine] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0, draws: 0 });
  const [moveHistory, setMoveHistory] = useState<number[]>([]);

  function resetBoard() {
    setBoard(createEmptyBoard());
    setCurrent((c) => (c === 1 ? 2 : 1));
    setWinner(null);
    setLine([]);
    setLastMove(null);
    setMoveHistory([]);
  }

  function handleUndo() {
    if (winner || moveHistory.length === 0) return;
    const lastCol = moveHistory[moveHistory.length - 1];
    const nb = board.map((r) => [...r]);
    for (let r = 0; r < 6; r++) if (nb[r][lastCol] !== 0) { nb[r][lastCol] = 0; break; }
    setBoard(nb);
    setMoveHistory((h) => h.slice(0, -1));
    setCurrent((c) => (c === 1 ? 2 : 1));
    triggerHaptic(10);
  }

  function handleColumn(col: number) {
    if (winner) return;
    const res = makeMove(board, col, current);
    if (!res) { triggerHaptic([10, 30, 10]); return; }
    const nb = res.board;
    const win = checkWinner(nb);
    setBoard(nb);
    setLastMove({ row: res.row, col });
    setMoveHistory((h) => [...h, col]);
    sfxDrop(muted);
    triggerHaptic(16);
    if (win.winner) {
      setWinner(win.winner);
      setLine(win.line);
      sfxWin(muted);
      triggerHaptic([20, 40, 20]);
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.68 }, colors: win.winner === 1 ? ["#dc2626", "#d9a441"] : ["#5cc87a", "#d9a441"] });
      setScores((s) => (win.winner === 1 ? { ...s, p1: s.p1 + 1 } : { ...s, p2: s.p2 + 1 }));
    } else if (win.isDraw) {
      setWinner("draw");
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
    } else setCurrent((c) => (c === 1 ? 2 : 1));
  }

  const names = { 1: p1Name, 2: p2Name } as const;

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pb-8">
      {/* players - minimal */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
        {[1, 2].map((n) => {
          const pn = n as 1 | 2;
          const active = current === pn && !winner;
          const won = winner === pn;
          return (
            <div key={n} className={`rounded-[16px] border px-3 py-3 flex items-center gap-3 ${active ? "bg-white border-[#1e150e]/15 shadow-sm" : "bg-white/70 border-[#1e150e]/10"} ${won ? "ring-1 ring-[#1e150e]" : ""}`}>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${pn === 1 ? "bg-[#dc2626]" : "bg-[#5cc87a]"}`}>{pn}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold leading-none truncate flex items-center gap-1.5">
                  {names[pn]} {active && <span className="h-1.5 w-1.5 rounded-full bg-[#1e150e] opacity-70" />}
                </div>
                <div className="text-xs text-[#8c7a60] tabular-nums">{pn === 1 ? scores.p1 : scores.p2} wins</div>
              </div>
              {won && <span className="text-sm">—</span>}
            </div>
          );
        })}
        <div className="text-[11px] font-semibold tracking-widest text-[#8c7a60]">VS</div>
      </div>
      <div className="text-center text-xs text-[#8c7a60] mb-3 tabular-nums">{scores.draws} draws</div>

      <AnimatePresence mode="wait">
        {!winner ? (
          <motion.div key={current} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 flex justify-center">
            <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold border ${current === 1 ? "bg-[#dc2626]/10 border-[#dc2626]/20 text-[#7f1d1d]" : "bg-[#5cc87a]/10 border-[#5cc87a]/20 text-[#14532d]"}`}>
              <span className={`h-2 w-2 rounded-full ${current === 1 ? "bg-[#dc2626]" : "bg-[#5cc87a]"}`} /> {names[current]} to play
            </div>
          </motion.div>
        ) : (
          <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-3 rounded-[14px] px-4 py-3 text-center text-sm font-semibold border ${winner === "draw" ? "bg-white border-[#1e150e]/10" : winner === 1 ? "bg-[#dc2626]/10 border-[#dc2626]/15 text-[#7f1d1d]" : "bg-[#5cc87a]/10 border-[#5cc87a]/15 text-[#14532d]"}`}>
            {winner === "draw" ? "Draw — well matched." : `${names[winner]} wins.`}
          </motion.div>
        )}
      </AnimatePresence>

      <GameBoard board={board} currentPlayer={current} winningLine={line} onColumnClick={handleColumn} disabled={!!winner} lastMove={lastMove} />

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={handleUndo} disabled={!!winner || moveHistory.length === 0} className="rounded-full py-3 bg-white border border-[#1e150e]/12 font-medium text-sm disabled:opacity-30 active:scale-[0.99]">Undo</button>
        <button onClick={resetBoard} className="rounded-full py-3 bg-[#1e150e] text-[#fdf8ec] font-semibold text-sm active:scale-[0.99]">{winner ? "Play again" : "Reset board"}</button>
      </div>
    </div>
  );
}
