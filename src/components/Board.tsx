"use client";
import { Board as BoardType, COLS } from "@/lib/game";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  board: BoardType;
  currentPlayer: 1 | 2;
  winningLine: [number, number][];
  onColumnClick: (col: number) => void;
  disabled?: boolean;
  lastMove?: { row: number; col: number } | null;
};

const CellView = memo(function CellView({
  cell,
  winning,
  isLast,
  dimmed,
  activeIsRed,
}: {
  cell: 0 | 1 | 2;
  winning: boolean;
  isLast: boolean;
  dimmed: boolean;
  activeIsRed: boolean;
}) {
  return (
    <div
      className={`relative aspect-square rounded-full flex items-center justify-center p-[2px] sm:p-[3px] ${
        dimmed
          ? activeIsRed
            ? "bg-[#dc2626]/15 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.18)]"
            : "bg-[#5cc87a]/20 shadow-[inset_0_0_0_1px_rgba(92,200,122,0.22)]"
          : ""
      }`}
    >
      {/* hole */}
      <div
        className={`absolute inset-1 rounded-full bg-[#fdf8ec] ${
          dimmed
            ? "shadow-[inset_0_2px_6px_rgba(30,21,14,0.22),inset_0_0_0_1px_rgba(30,21,14,0.11)]"
            : "shadow-[inset_0_2px_6px_rgba(30,21,14,0.18),inset_0_0_0_1px_rgba(30,21,14,0.08)]"
        }`}
      />
      {cell !== 0 && (
        <div
          className={`relative z-[2] h-full w-full rounded-full flex items-center justify-center overflow-hidden
            ${cell === 1 ? "bg-[#dc2626] border-[#991b1b]/40" : "bg-[#5cc87a] border-[#2f6e3a]/25"}
            ${winning ? "ring-2 ring-[#1e150e] ring-offset-2 ring-offset-[#efe2c3]" : ""}
            ${isLast ? "animate-disc-drop" : ""}
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
          {winning && <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-white/90 shadow-sm" />}
        </div>
      )}
    </div>
  );
});

export default function Board({ board, currentPlayer, winningLine, onColumnClick, disabled, lastMove }: Props) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const activeIsRed = currentPlayer === 1;
  const boardRef = useRef<HTMLDivElement>(null);
  const isPointerDown = useRef(false);
  // Mirror of hoverCol for use inside pointer-up without stale closures.
  const hoverRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const pendingXRef = useRef<number | null>(null);
  const onColumnClickRef = useRef(onColumnClick);
  const boardRef2 = useRef(board);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    onColumnClickRef.current = onColumnClick;
    boardRef2.current = board;
    disabledRef.current = disabled;
  });

  const winSet = useMemo(() => {
    const s = new Set<string>();
    for (const [r, c] of winningLine) s.add(`${r}:${c}`);
    return s;
  }, [winningLine]);

  const topRow = board[0];

  const setHoverIfChanged = useCallback((col: number | null) => {
    if (hoverRef.current === col) return;
    hoverRef.current = col;
    setHoverCol(col);
  }, []);

  const getColFromX = useCallback((clientX: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) return null;
    const col = Math.floor((x / rect.width) * COLS);
    return Math.max(0, Math.min(COLS - 1, col));
  }, []);

  // rAF-throttled hover update — pointermove can fire 60-120x/sec and each
  // setState re-renders 42 cells, which janks low-end phones.
  const flushPendingHover = useCallback(() => {
    rafRef.current = 0;
    const x = pendingXRef.current;
    pendingXRef.current = null;
    if (x === null || x === undefined) return;
    if (disabledRef.current) return;
    const col = getColFromX(x);
    if (col === null) {
      setHoverIfChanged(null);
      return;
    }
    if (boardRef2.current[0][col] !== 0) {
      // Full column — don't highlight, but keep tracking so drags feel live.
      if (hoverRef.current === col) setHoverIfChanged(null);
      return;
    }
    setHoverIfChanged(col);
  }, [getColFromX, setHoverIfChanged]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scheduleHover = useCallback((clientX: number) => {
    pendingXRef.current = clientX;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flushPendingHover);
  }, [flushPendingHover]);

  const dropRef = useCallback((col: number) => {
    if (disabledRef.current) return;
    if (col < 0 || col >= COLS) return;
    if (boardRef2.current[0][col] !== 0) return;
    onColumnClickRef.current(col);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    // On touch, hover only matters while dragging to aim — ignore stray moves.
    if (e.pointerType !== "mouse" && !isPointerDown.current) return;
    scheduleHover(e.clientX);
  }, [disabled, scheduleHover]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    isPointerDown.current = true;
    const col = getColFromX(e.clientX);
    if (col !== null && boardRef2.current[0][col] === 0) setHoverIfChanged(col);
  }, [disabled, getColFromX, setHoverIfChanged]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    if (disabledRef.current) return;
    // Compute the column from the release position — never gate on stale
    // hoverCol state (on phones there is no hover, so it is null on first tap
    // and the old code dropped the move).
    const col = getColFromX(e.clientX) ?? hoverRef.current;
    if (col === null || col === undefined) return;
    dropRef(col);
  }, [getColFromX, dropRef]);

  return (
    <div className="w-full max-w-[420px] mx-auto select-none flex flex-col justify-center">
      {/* column affordance - ghost preview. Real <button>s so taps use native
          click handling (reliable on iOS) instead of pointer coordinate math. */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 px-1 shrink-0">
        {Array.from({ length: COLS }).map((_, col) => {
          const isActive = hoverCol === col && !disabled;
          const canDrop = topRow[col] === 0 && !disabled;
          return (
            <button
              key={col}
              type="button"
              aria-label={`Drop in column ${col + 1}`}
              disabled={!canDrop}
              onClick={() => dropRef(col)}
              onPointerEnter={() => { if (canDrop) setHoverIfChanged(col); }}
              onFocus={() => { if (canDrop) setHoverIfChanged(col); }}
              className={`relative h-6 sm:h-7 flex items-center justify-center rounded-md ${canDrop ? "cursor-pointer" : "opacity-40 cursor-default"}`}
              style={{ touchAction: "manipulation" }}
            >
              {isActive && canDrop ? (
                <span
                  className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border shadow-sm transition-transform duration-100 scale-100 opacity-100 ${activeIsRed ? "bg-[#dc2626] border-[#991b1b]/30" : "bg-[#5cc87a] border-[#2f6e3a]/20"}`}
                  style={{ boxShadow: "inset 0 1px 1px rgba(0,0,0,0.12), inset 0 -1px 1px rgba(0,0,0,0.12)" }}
                />
              ) : (
                <span className="text-[11px] font-medium text-[#8c7a60]/60 tabular-nums">{col + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* board */}
      <div
        ref={boardRef}
        className="relative rounded-[22px] p-2.5 sm:p-3 bg-[#efe2c3] border border-[#1e150e]/12 shadow-[0_12px_32px_rgba(30,21,14,0.12),inset_0_1px_0_rgba(255,255,255,0.7)]"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { if (!isPointerDown.current) setHoverIfChanged(null); }}
        onPointerCancel={() => { isPointerDown.current = false; pendingXRef.current = null; setHoverIfChanged(null); }}
        style={{ touchAction: "pan-y" }}
      >
        <div className="relative grid grid-cols-7 gap-1.5 sm:gap-2">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <CellView
                key={`${r}-${c}`}
                cell={cell}
                winning={winSet.has(`${r}:${c}`)}
                isLast={lastMove?.row === r && lastMove?.col === c}
                dimmed={hoverCol === c && !disabled && topRow[c] === 0}
                activeIsRed={activeIsRed}
              />
            ))
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
