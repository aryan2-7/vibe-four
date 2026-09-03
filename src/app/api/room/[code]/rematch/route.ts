import { NextRequest, NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/roomStore";
import { createEmptyBoard } from "@/lib/game";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const body = await req.json();
    const token = body.token as string;
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const isPlayer = room.players.some((p) => p.token === token);
    if (!isPlayer) return NextResponse.json({ error: "Not in room" }, { status: 403 });

    if (!room.scores) room.scores = { p1: 0, p2: 0, draws: 0 };
    if (!room.rematchRequests.includes(token)) room.rematchRequests.push(token);

    // if both players requested, reset board. For solo rematch after win, if only 1 player in room waiting? Allow single player to reset after leave? We'll require both when 2 players
    const needed = room.players.length === 1 ? 1 : 2;
    if (room.rematchRequests.length >= needed) {
      room.board = createEmptyBoard();
      room.winner = null;
      room.winningLine = [];
      // alternate starter for fairness — loser starts or swap
      room.currentPlayer = room.winner === 1 ? 2 : room.winner === 2 ? 1 : room.currentPlayer === 1 ? 2 : 1;
      // fallback to 1 if no winner yet
      if (!room.currentPlayer) room.currentPlayer = 1;
      room.status = room.players.length === 2 ? "playing" : "waiting";
      room.rematchRequests = [];
      room.moveCount = 0;
      room.updatedAt = Date.now();
      await setRoom(room);
      return NextResponse.json({ room, rematched: true });
    }

    room.updatedAt = Date.now();
    await setRoom(room);
    return NextResponse.json({ room, rematched: false, waiting: true });
  } catch {
    return NextResponse.json({ error: "Rematch failed" }, { status: 500 });
  }
}
