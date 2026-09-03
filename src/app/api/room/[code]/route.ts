import { NextRequest, NextResponse } from "next/server";
import { getRoom, sanitizeRoom } from "@/lib/roomStore";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = req.nextUrl.searchParams.get("token") || undefined;
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const safe = sanitizeRoom(room, token);
  return NextResponse.json({ room: safe });
}
