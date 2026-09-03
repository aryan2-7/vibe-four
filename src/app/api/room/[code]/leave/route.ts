import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/roomStore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token as string | undefined;
    // also allow token via query for beacon
    const qToken = req.nextUrl.searchParams.get("token");
    const finalToken = token || qToken || "";
    if (!finalToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const result = await leaveRoom(code, finalToken);
    if (result.deleted) {
      return NextResponse.json({ deleted: true, message: "Room deleted" }, { status: 200 });
    }
    return NextResponse.json({ deleted: false, room: result.room }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Leave failed" }, { status: 500 });
  }
}

// Support sendBeacon which uses POST with maybe no json, and also GET fallback
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return POST(req, { params } as never);
}
