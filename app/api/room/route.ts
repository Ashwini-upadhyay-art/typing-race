import { NextResponse } from "next/server";
import { generateRoomCode } from "@/lib/utils";

// The Next.js API only allocates a room code; the actual room is created
// in-memory on the socket server when the first player joins.
export async function POST() {
  const code = generateRoomCode();
  return NextResponse.json({ code });
}
