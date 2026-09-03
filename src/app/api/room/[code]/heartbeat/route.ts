import { NextRequest, NextResponse } from "next/server";
import { touchRoom } from "@/lib/roomStore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.nextUrl.searchParams.get("token") || "";
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
    const room = await touchRoom(code, token as string);
    if (!room) return NextResponse.json({ error: "Room not found", deleted: true }, { status: 410 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}
