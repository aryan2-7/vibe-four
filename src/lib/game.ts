// src/lib/game.ts — pure engine, no React
export const ROWS = 6;
export const COLS = 7;
export type Cell = 0 | 1 | 2;
export type Board = Cell[][];
export type WinResult = { winner: 1 | 2 | null; line: [number, number][]; isDraw: boolean };

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row] as Cell[]);
}

export function isValidMove(board: Board, col: number): boolean {
  if (col < 0 || col >= COLS) return false;
  return board[0][col] === 0;
}

export function getNextRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
  return -1;
}

export function makeMove(board: Board, col: number, player: 1 | 2): { board: Board; row: number } | null {
  const row = getNextRow(board, col);
  if (row === -1) return null;
  const next = cloneBoard(board);
  next[row][col] = player;
  return { board: next, row };
}

export function checkWinner(board: Board): WinResult {
  // directions: horizontal, vertical, diag down-right, diag up-right
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (cell === 0) continue;
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
          if (board[nr][nc] !== cell) break;
          line.push([nr, nc]);
        }
        if (line.length === 4) {
          return { winner: cell as 1 | 2, line, isDraw: false };
        }
      }
    }
  }
  const isDraw = board.every((row) => row.every((c) => c !== 0));
  return { winner: null, line: [], isDraw };
}

export function getValidColumns(board: Board): number[] {
  return Array.from({ length: COLS }, (_, i) => i).filter((c) => isValidMove(board, c));
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
