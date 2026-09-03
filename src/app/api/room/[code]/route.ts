import { NextRequest, NextResponse } from "next/server";
import { getRoom, sanitizeRoom, touchRoom } from "@/lib/roomStore";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = req.nextUrl.searchParams.get("token") || undefined;

  // heartbeat touch if token present
  let room = null as Awaited<ReturnType<typeof getRoom>>;
  if (token) {
    room = await touchRoom(code, token);
    if (!room) return NextResponse.json({ error: "Room not found", deleted: true }, { status: 410 });
  } else {
    room = await getRoom(code);
    if (!room) return NextResponse.json({ error: "Room not found", deleted: true }, { status: 410 });
  }

  // if the requester was the one who left, inform them room is deleted for them
  if (token && !room.players.some((p) => p.token === token)) {
    // they left but room still exists with other player - let them know they left
    // check if they are in leftPlayers vs just stale
    const stillExists = room.leftPlayers?.some((lp) => {
      // we don't have token mapping for leftPlayers, so just assume if they not in players and room not vs them, they left
      return true;
    });
    // For polling after leave, return deleted so client can redirect
    // But if they left intentionally, they shouldn't be polling. We return 410 for explicit left case.
    // Detect: if they not in players and room.status === "abandoned" and single player, treat as left
    if (room.leftPlayers && room.leftPlayers.length > 0) {
      return NextResponse.json({ error: "You left the room", left: true, deleted: false, room: sanitizeRoom(room, token) }, { status: 200 });
    }
  }

  const safe = sanitizeRoom(room, token);
  // add cache headers to avoid over-polluting? But polling needs fresh.
  return NextResponse.json(
    { room: safe },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
