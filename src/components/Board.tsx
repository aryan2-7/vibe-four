"use client";
import { Board as BoardType, COLS } from "@/lib/game";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";

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
  const activeIsRed = currentPlayer === 1;
  const boardRef = useRef<HTMLDivElement>(null);
  const isPointerDown = useRef(false);

  const getColFromX = useCallback((clientX: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) return null;
    const col = Math.floor((x / rect.width) * COLS);
    return Math.max(0, Math.min(COLS - 1, col));
  }, []);

  const lastClickAt = useRef(0);
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const col = getColFromX(e.clientX);
    if (col !== null && board[0][col] === 0) {
      setHoverCol(col);
    } else if (col !== null && board[0][col] !== 0) {
      setHoverCol(null);
    }
  }, [disabled, board, getColFromX]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    isPointerDown.current = true;
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
    handlePointerMove(e);
  }, [handlePointerMove, disabled]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    if (disabled || hoverCol === null || board[0][hoverCol] !== 0) return;
    const now = Date.now();
    if (now - lastClickAt.current < 400) return;
    lastClickAt.current = now;
    // recompute col from up position to support drag-release at different col
    const col = getColFromX(e.clientX) ?? hoverCol;
    if (col !== null && board[0][col] === 0) {
      onColumnClick(col);
    } else if (board[0][hoverCol] === 0) {
      onColumnClick(hoverCol);
    }
  }, [disabled, hoverCol, board, onColumnClick, getColFromX]);

  return (
    <div className="w-full max-w-[420px] mx-auto select-none flex flex-col justify-center">
      {/* column affordance - ghost preview */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 px-1 shrink-0">
        {Array.from({ length: COLS }).map((_, col) => {
          const isActive = hoverCol === col && !disabled;
          const canDrop = board[0][col] === 0 && !disabled;
          return (
            <div
              key={col}
              className={`relative h-6 sm:h-7 flex items-center justify-center transition ${canDrop ? "" : "opacity-40"}`}
            >
              <AnimatePresence>
                {isActive && canDrop && (
                  <motion.div
                    initial={{ y: -6, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -4, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border shadow-sm ${activeIsRed ? "bg-[#dc2626] border-[#991b1b]/30" : "bg-[#5cc87a] border-[#2f6e3a]/20"}`}
                    style={{ boxShadow: "inset 0 1px 1px rgba(0,0,0,0.12), inset 0 -1px 1px rgba(0,0,0,0.12)" }}
                  />
                )}
              </AnimatePresence>
              {!isActive && <span className="text-[11px] font-medium text-[#8c7a60]/60 tabular-nums">{col + 1}</span>}
            </div>
          );
        })}
      </div>

      {/* board */}
      <div
        ref={boardRef}
        className="relative rounded-[22px] p-2.5 sm:p-3 bg-[#efe2c3] border border-[#1e150e]/12 shadow-[0_12px_32px_rgba(30,21,14,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] touch-none"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { if (!isPointerDown.current) setHoverCol(null); }}
        onPointerCancel={() => { isPointerDown.current = false; setHoverCol(null); }}
        style={{ touchAction: "none" }}
      >


        <div className="relative grid grid-cols-7 gap-1.5 sm:gap-2">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const winning = isWinningCell(winningLine, r, c);
              const isLast = lastMove?.row === r && lastMove?.col === c;
              const isHoveredCol = hoverCol === c && !disabled && board[0][c] === 0;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative aspect-square rounded-full flex items-center justify-center p-[2px] sm:p-[3px] transition-colors duration-100
                    ${isHoveredCol ? (activeIsRed ? "bg-[#dc2626]/15 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.18)]" : "bg-[#5cc87a]/20 shadow-[inset_0_0_0_1px_rgba(92,200,122,0.22)]") : "bg-transparent"}`}
                >
                  {/* hole */}
                  <div className={`absolute inset-1 rounded-full bg-[#fdf8ec] transition-shadow duration-100 ${isHoveredCol ? "shadow-[inset_0_2px_6px_rgba(30,21,14,0.22),inset_0_0_0_1px_rgba(30,21,14,0.11)]" : "shadow-[inset_0_2px_6px_rgba(30,21,14,0.18),inset_0_0_0_1px_rgba(30,21,14,0.08)]"}`} />

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
                        <div className="absolute inset-[7%] rounded-full border border-black/10" />
                        <div className="absolute inset-[16%] rounded-full border border-black/[0.07] bg-black/[0.04]" />
                        <div className="absolute inset-[28%] rounded-full bg-black/[0.06] border border-white/[0.04]" />
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

      {/* turn hint - compact on small height */}
      <div className="mt-2 sm:mt-3 flex justify-center shrink-0">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] sm:text-xs font-semibold border ${activeIsRed ? "bg-[#dc2626]/10 border-[#dc2626]/15 text-[#7f1d1d]" : "bg-[#5cc87a]/10 border-[#5cc87a]/15 text-[#14532d]"} ${disabled ? "opacity-60" : ""}`}>
          <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${activeIsRed ? "bg-[#dc2626]" : "bg-[#5cc87a]"}`} />
          {disabled ? "Opponent's turn" : "Your turn"}<span className="opacity-50 hidden sm:inline">· Tap or drag column</span>
        </div>
      </div>
    </div>
  );
}
