import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/roomStore";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.playerName || "Player 1").toString().trim().slice(0, 20) || "Player 1";
    const playerId = body.playerId || uuid();
    const token = uuid();
    const room = await createRoom(name, playerId, token);
    return NextResponse.json({ code: room.code, token, playerId, playerNumber: 1, room });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
