import { NextResponse } from "next/server";
import { generateRoomCode } from "@/lib/utils";

// Returns a fresh 6-character room code. There is no server-side room record —
// rooms exist as Pusher presence channels keyed by this code, and the host is
// whoever joins the channel first.
export async function POST() {
  return NextResponse.json({ code: generateRoomCode() });
}
