import { NextRequest, NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/roomStore";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body.code || "").toString().toUpperCase().trim();
    const name = (body.playerName || "Player 2").toString().trim().slice(0, 20) || "Player 2";
    const playerId = body.playerId || uuid();
    let token = body.token as string | undefined;

    if (!code || code.length !== 4) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // If token matches existing player, treat as reconnection
    if (token) {
      const existing = room.players.find((p) => p.token === token);
      if (existing) {
        // update name maybe
        existing.name = name;
        room.updatedAt = Date.now();
        await setRoom(room);
        const idx = room.players.indexOf(existing);
        return NextResponse.json({ code: room.code, token, playerId: existing.id, playerNumber: idx + 1, room });
      }
    }

    if (room.players.length >= 2) {
      return NextResponse.json({ error: "Room full" }, { status: 400 });
    }
    if (room.status === "finished") {
      // allow joining finished? still full
      return NextResponse.json({ error: "Game already finished, ask host to rematch" }, { status: 400 });
    }

    token = token || uuid();
    const newPlayer = { id: playerId, name, token, joinedAt: Date.now() };
    room.players.push(newPlayer);
    if (room.players.length === 2) room.status = "playing";
    room.updatedAt = Date.now();
    await setRoom(room);

    return NextResponse.json({ code: room.code, token, playerId, playerNumber: 2, room });
  } catch (e) {
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
