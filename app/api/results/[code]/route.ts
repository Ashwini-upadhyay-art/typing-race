import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RaceResult } from "@/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const match = await prisma.match.findUnique({
    where: { roomCode: code.toUpperCase() },
    include: { players: { include: { user: true } } },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result: RaceResult = {
    roomCode: match.roomCode,
    passage: "",
    players: match.players
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        id: p.userId,
        username: p.user.username,
        progress: 1,
        wpm: p.wpm,
        accuracy: p.accuracy,
        finished: true,
        position: p.position,
      })),
  };
  return NextResponse.json(result);
}
