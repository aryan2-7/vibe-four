import { NextRequest, NextResponse } from "next/server";
import { getRoom, setRoom, getPlayerNumber } from "@/lib/roomStore";
import { checkWinner, makeMove } from "@/lib/game";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const body = await req.json();
    const token = body.token as string;
    const col = Number(body.col);

    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
    if (!Number.isInteger(col) || col < 0 || col > 6) return NextResponse.json({ error: "Invalid column" }, { status: 400 });

    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const playerNumber = getPlayerNumber(room, token);
    if (!playerNumber) return NextResponse.json({ error: "Not in room" }, { status: 403 });

    if (room.status === "waiting") return NextResponse.json({ error: "Waiting for opponent" }, { status: 400 });
    if (room.status === "finished") return NextResponse.json({ error: "Game over, rematch?" }, { status: 400 });
    if (room.winner) return NextResponse.json({ error: "Game already won" }, { status: 400 });

    if (room.currentPlayer !== playerNumber) return NextResponse.json({ error: "Not your turn" }, { status: 400 });

    const result = makeMove(room.board, col, playerNumber as 1 | 2);
    if (!result) return NextResponse.json({ error: "Column full" }, { status: 400 });

    room.board = result.board;
    room.moveCount += 1;

    const win = checkWinner(room.board);
    if (win.winner) {
      room.winner = win.winner;
      room.winningLine = win.line;
      room.status = "finished";
    } else if (win.isDraw) {
      room.winner = "draw";
      room.status = "finished";
    } else {
      room.currentPlayer = room.currentPlayer === 1 ? 2 : 1;
    }
    room.updatedAt = Date.now();
    await setRoom(room);

    return NextResponse.json({ room, row: result.row });
  } catch (e) {
    return NextResponse.json({ error: "Move failed" }, { status: 500 });
  }
}
