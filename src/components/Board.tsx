"use client";
import { Board as BoardType, ROWS, COLS, Cell } from "@/lib/game";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type Props = {
  board: BoardType;
  currentPlayer: 1 | 2;
  winningLine: [number, number][];
  onColumnClick: (col: number) => void;
  disabled?: boolean;
  lastMove?: { row: number; col: number } | null;
  myPlayer?: 1 | 2 | null;
};

function isWinningCell(line: [number, number][], r: number, c: number) {
  return line.some(([lr, lc]) => lr === r && lc === c);
}

export default function Board({ board, currentPlayer, winningLine, onColumnClick, disabled, lastMove, myPlayer }: Props) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const activeColor = currentPlayer === 1 ? "from-red-500 to-orange-500" : "from-amber-400 to-yellow-500";
  const activeShadow = currentPlayer === 1 ? "shadow-red-500/30" : "shadow-amber-400/30";

  return (
    <div className="w-full max-w-[420px] mx-auto select-none">
      {/* column indicators */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-3 px-1">
        {Array.from({ length: COLS }).map((_, col) => {
          const isActive = hoverCol === col && !disabled;
          const canDrop = board[0][col] === 0 && !disabled;
          return (
            <button
              key={col}
              onPointerEnter={() => setHoverCol(col)}
              onPointerLeave={() => setHoverCol(null)}
              onClick={() => canDrop && onColumnClick(col)}
              disabled={!canDrop}
              className={`relative h-8 sm:h-10 rounded-xl flex items-center justify-center transition-all ${canDrop ? "cursor-pointer active:scale-95" : "cursor-default opacity-40"}`}
              aria-label={`Drop in column ${col + 1}`}
            >
              {/* ghost disc preview */}
              <AnimatePresence>
                {isActive && canDrop && (
                  <motion.div
                    initial={{ y: -8, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 0.9, scale: 1 }}
                    exit={{ y: -4, opacity: 0, scale: 0.9 }}
                    className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-br ${activeColor} shadow-lg ${activeShadow} border border-white/20`}
                  />
                )}
              </AnimatePresence>
              {!isActive && <span className="text-[11px] font-bold text-white/25">{col + 1}</span>}
            </button>
          );
        })}
      </div>

      {/* board */}
      <div
        className="relative rounded-[24px] sm:rounded-[28px] p-2.5 sm:p-3 bg-gradient-to-br from-[#1e2442] via-[#1a1f3d] to-[#10142b] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onPointerLeave={() => setHoverCol(null)}
      >
        {/* inner shadow */}
        <div className="absolute inset-3 rounded-[20px] bg-black/20 blur-[1px] pointer-events-none" />
        <div className="relative grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* column hit areas for mobile - bigger tap */}
          {Array.from({ length: COLS }).map((_, col) => (
            <div
              key={`hit-${col}`}
              onClick={() => board[0][col] === 0 && !disabled && onColumnClick(col)}
              onPointerEnter={() => setHoverCol(col)}
              className={`absolute top-0 bottom-0 w-[calc((100%-12px)/7)] sm:w-[calc((100%-16px)/7)] z-10 ${col === 0 ? "left-0" : ""}`}
              style={{ left: `calc(${col} * (100% / 7) + ${col * 6}px /7)` }}
            />
          ))}

          {board.map((row, r) =>
            row.map((cell, c) => {
              const winning = isWinningCell(winningLine, r, c);
              const isLast = lastMove?.row === r && lastMove?.col === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative aspect-square rounded-full flex items-center justify-center p-[2px] sm:p-[3px] transition-colors ${hoverCol === c && board[0][c] === 0 && !disabled ? "bg-white/[0.06]" : "bg-transparent"}`}
                >
                  {/* hole */}
                  <div className="absolute inset-1 rounded-full bg-[#0a0d1f] shadow-[inset_0_3px_8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-black/30" />

                  {/* disc */}
                  <AnimatePresence>
                    {cell !== 0 && (
                      <motion.div
                        layoutId={isLast ? undefined : `disc-${r}-${c}`}
                        initial={{ y: -260, scale: 0.9, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        transition={
                          isLast
                            ? { type: "spring", damping: 14, stiffness: 220, mass: 0.9 }
                            : { duration: 0.18 }
                        }
                        className={`relative z-[2] h-full w-full rounded-full border flex items-center justify-center overflow-hidden
                          ${cell === 1 ? "bg-gradient-to-br from-red-500 via-red-500 to-orange-600 border-white/25 shadow-[0_4px_12px_rgba(239,68,68,0.5),inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_-3px_6px_rgba(0,0,0,0.3)]" : "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-white/30 shadow-[0_4px_12px_rgba(251,191,36,0.55),inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(0,0,0,0.25)]"}
                          ${winning ? "ring-2 ring-white/90 ring-offset-2 ring-offset-transparent scale-[1.02]" : ""}
                          ${isLast ? "animate-[pulse-glow_1s_ease-in-out_infinite]" : ""}
                        `}
                      >
                        {/* highlight */}
                        <div className="absolute top-[14%] left-[18%] h-[32%] w-[42%] rounded-full bg-white/45 blur-[1px]" />
                        <div className="absolute top-[12%] left-[16%] h-[22%] w-[28%] rounded-full bg-white/70 blur-[0.5px]" />
                        {winning && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-white text-[10px] sm:text-xs font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                          >
                            ★
                          </motion.span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* winning glow behind */}
                  {winning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 rounded-full bg-white/20 blur-[6px] -z-0"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* board feet */}
        <div className="absolute -bottom-1 left-6 right-6 h-2 bg-black/30 blur-[4px] rounded-full -z-10" />
      </div>

      {/* turn hint for mobile */}
      <div className="mt-4 flex justify-center">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-widest uppercase border backdrop-blur
          ${currentPlayer === 1 ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-amber-400/15 border-amber-400/30 text-amber-200"}
          ${disabled ? "opacity-60" : ""}`}
        >
          <span className={`h-2 w-2 rounded-full animate-pulse ${currentPlayer === 1 ? "bg-red-500" : "bg-amber-400"}`} />
          {disabled ? "Opponent's turn" : "Your turn"} • Tap column to drop
        </div>
      </div>
    </div>
  );
}
