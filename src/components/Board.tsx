"use client";
import { Board as BoardType, COLS } from "@/lib/game";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type Props = {
  board: BoardType;
  currentPlayer: 1 | 2;
  winningLine: [number, number][];
  onColumnClick: (col: number) => void;
  disabled?: boolean;
  lastMove?: { row: number; col: number } | null;
};

function isWinningCell(line: [number, number][], r: number, c: number) {
  return line.some(([lr, lc]) => lr === r && lc === c);
}

export default function Board({ board, currentPlayer, winningLine, onColumnClick, disabled, lastMove }: Props) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const activeIsTerracotta = currentPlayer === 1;

  return (
    <div className="w-full max-w-[420px] mx-auto select-none">
      {/* column affordance - subtle */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2.5 px-1">
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
              className={`relative h-7 sm:h-8 rounded-full flex items-center justify-center transition ${canDrop ? "cursor-pointer active:scale-95" : "cursor-default"}`}
              aria-label={`Drop in column ${col + 1}`}
            >
              <AnimatePresence>
                {isActive && canDrop && (
                  <motion.div
                    initial={{ y: -6, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -4, opacity: 0, scale: 0.9 }}
                    className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border shadow-sm ${activeIsTerracotta ? "bg-[#dc2626] border-[#991b1b]/30" : "bg-[#5cc87a] border-[#2f6e3a]/20"}`}
                    style={{ boxShadow: "inset 0 1px 1px rgba(0,0,0,0.12), inset 0 -1px 1px rgba(0,0,0,0.12)" }}
                  />
                )}
              </AnimatePresence>
              {!isActive && <span className="text-[11px] font-medium text-[#8c7a60]/70 tabular-nums">{col + 1}</span>}
            </button>
          );
        })}
      </div>

      {/* board */}
      <div
        className="relative rounded-[22px] p-2.5 sm:p-3 bg-[#efe2c3] border border-[#1e150e]/12 shadow-[0_12px_32px_rgba(30,21,14,0.12),inset_0_1px_0_rgba(255,255,255,0.7)]"
        onPointerLeave={() => setHoverCol(null)}
      >
        <div className="relative grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* hit areas */}
          {Array.from({ length: COLS }).map((_, col) => (
            <div
              key={`hit-${col}`}
              onClick={() => board[0][col] === 0 && !disabled && onColumnClick(col)}
              onPointerEnter={() => setHoverCol(col)}
              className="absolute top-0 bottom-0 z-10"
              style={{ left: `calc(${col} * (100% / 7))`, width: `calc(100% / 7)` }}
            />
          ))}

          {board.map((row, r) =>
            row.map((cell, c) => {
              const winning = isWinningCell(winningLine, r, c);
              const isLast = lastMove?.row === r && lastMove?.col === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative aspect-square rounded-full flex items-center justify-center p-[2px] sm:p-[3px] ${hoverCol === c && board[0][c] === 0 && !disabled ? "bg-[#1e150e]/[0.04]" : "bg-transparent"} rounded-full`}
                >
                  {/* hole */}
                  <div className="absolute inset-1 rounded-full bg-[#fdf8ec] shadow-[inset_0_2px_6px_rgba(30,21,14,0.18),inset_0_0_0_1px_rgba(30,21,14,0.08)]" />

                  <AnimatePresence>
                    {cell !== 0 && (
                      <motion.div
                        initial={{ y: -220, scale: 0.96, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        transition={isLast ? { type: "spring", damping: 18, stiffness: 280, mass: 0.9 } : { duration: 0.16 }}
                        className={`relative z-[2] h-full w-full rounded-full flex items-center justify-center overflow-hidden
                          ${cell === 1 ? "bg-[#dc2626] border-[#991b1b]/40" : "bg-[#5cc87a] border-[#2f6e3a]/25"}
                          ${winning ? "ring-2 ring-[#1e150e] ring-offset-2 ring-offset-[#efe2c3]" : ""}
                        `}
                        style={
                          cell === 1
                            ? { boxShadow: "inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -2px 3px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.12)" }
                            : { boxShadow: "inset 0 1px 1px rgba(255,255,255,0.14), inset 0 -2px 3px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1)" }
                        }
                      >
                        {/* matte lip — outer rim */}
                        <div className="absolute inset-[7%] rounded-full border border-black/10" />
                        {/* inner recess — mimics molded center */}
                        <div className="absolute inset-[16%] rounded-full border border-black/[0.07] bg-black/[0.04]" />
                        <div className="absolute inset-[28%] rounded-full bg-black/[0.06] border border-white/[0.04]" />
                        {/* center pin dimple */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[14%] w-[14%] rounded-full bg-black/15 border border-white/10" />
                        {winning && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative z-10 h-1.5 w-1.5 rounded-full bg-white/90 shadow-sm" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* discreet turn hint */}
      <div className="mt-3.5 flex justify-center">
        <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${activeIsTerracotta ? "bg-[#dc2626]/10 border-[#dc2626]/15 text-[#7f1d1d]" : "bg-[#5cc87a]/10 border-[#5cc87a]/15 text-[#14532d]"} ${disabled ? "opacity-60" : ""}`}>
          <span className={`h-2 w-2 rounded-full ${activeIsTerracotta ? "bg-[#dc2626]" : "bg-[#5cc87a]"}`} />
          {disabled ? "Opponent's turn" : "Your turn"}<span className="opacity-50">· Tap column</span>
        </div>
      </div>
    </div>
  );
}
