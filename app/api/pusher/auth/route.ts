import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusherServer";

export async function POST(req: Request) {
  const formData = await req.formData();
  const socketId = formData.get("socket_id");
  const channel = formData.get("channel_name");
  if (typeof socketId !== "string" || typeof channel !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const username = (req.headers.get("x-username") || "Racer").slice(0, 16);

  const pusher = getPusherServer();
  const auth = pusher.authorizeChannel(socketId, channel, {
    user_id: socketId,
    user_info: { username, joinedAt: Date.now() },
  });
  return NextResponse.json(auth);
}
