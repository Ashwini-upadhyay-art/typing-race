import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { roomManager } from "./roomManager";
import { prisma } from "../lib/prisma";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../socket/events";
import type { Player } from "../types";

const PORT = Number(process.env.SOCKET_PORT ?? 4000);
const ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(
  httpServer,
  {
    cors: { origin: ORIGIN, methods: ["GET", "POST"] },
  }
);

io.on("connection", (socket) => {
  socket.data.playerId = socket.id;

  socket.on("room:join", ({ code, username }, ack) => {
    const cleanUser = (username || "Racer").trim().slice(0, 16) || "Racer";
    const room = roomManager.ensureRoom(code, socket.id);

    // If this socket is already a member, return current state idempotently —
    // this covers re-joins from the race page after lobby navigation.
    if (room.players.find((p) => p.id === socket.id)) {
      socket.data.username = cleanUser;
      socket.data.roomCode = room.code;
      socket.join(room.code);
      ack({ ok: true, state: room });
      return;
    }

    if (room.status !== "waiting") {
      ack({ ok: false, error: "Race already in progress" });
      return;
    }
    const player: Player = {
      id: socket.id,
      username: cleanUser,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
    };
    const updated = roomManager.addPlayer(room.code, player);
    if (!updated) {
      ack({ ok: false, error: "Could not join room" });
      return;
    }
    socket.data.username = cleanUser;
    socket.data.roomCode = updated.code;
    socket.join(updated.code);
    ack({ ok: true, state: updated });
    io.to(updated.code).emit("room:state", updated);
  });

  socket.on("room:leave", () => {
    leave(socket.id, socket.data.roomCode);
  });

  socket.on("race:start", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = roomManager.getRoom(code);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.status !== "waiting") return;
    if (room.players.length < 1) return;

    const counting = roomManager.setStatus(code, "countdown");
    if (!counting) return;
    io.to(code).emit("race:countdown", counting);

    setTimeout(() => {
      const racing = roomManager.setStatus(code, "racing");
      if (!racing) return;
      io.to(code).emit("race:started", racing);
    }, Math.max(0, (counting.startsAt ?? Date.now()) - Date.now()));
  });

  socket.on("race:progress", ({ progress, wpm, accuracy }) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = roomManager.updateProgress(code, socket.id, progress, wpm, accuracy);
    if (!room || room.status !== "racing") return;
    io.to(code).emit("race:tick", room.players);
  });

  socket.on("race:finish", async ({ wpm, accuracy }) => {
    const code = socket.data.roomCode;
    if (!code) return;
    const res = roomManager.markFinished(code, socket.id, wpm, accuracy);
    if (!res) return;
    io.to(code).emit("race:tick", res.room.players);

    if (res.allFinished) {
      const finished = roomManager.setStatus(code, "finished");
      if (!finished) return;
      // Persist results (best-effort).
      persistMatch(finished).catch((err) => {
        console.error("[persistMatch]", err);
      });
      io.to(code).emit("race:finished", {
        roomCode: finished.code,
        passage: finished.passage,
        players: [...finished.players].sort((a, b) => {
          if (a.finished !== b.finished) return a.finished ? -1 : 1;
          if (a.position && b.position) return a.position - b.position;
          return b.progress - a.progress;
        }),
      });
    }
  });

  socket.on("disconnect", () => {
    leave(socket.id, socket.data.roomCode);
  });

  function leave(playerId: string, code: string | undefined) {
    if (!code) return;
    const room = roomManager.removePlayer(code, playerId);
    socket.leave(code);
    if (room) {
      io.to(code).emit("room:player_left", playerId);
      io.to(code).emit("room:state", room);
    }
    socket.data.roomCode = undefined;
  }
});

async function persistMatch(room: {
  code: string;
  players: Player[];
}) {
  // Create a Match + MatchPlayer rows. Users are upserted by username for the MVP.
  const winner = [...room.players]
    .filter((p) => p.finished)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0];

  const users = await Promise.all(
    room.players.map((p) =>
      prisma.user.upsert({
        where: { username: p.username },
        create: { username: p.username, bestWpm: p.wpm },
        update: { bestWpm: { set: Math.max(0, p.wpm) } },
      })
    )
  );
  const winnerUser = winner ? users.find((u) => u.username === winner.username) : null;

  await prisma.match.create({
    data: {
      roomCode: room.code,
      finishedAt: new Date(),
      winnerId: winnerUser?.id,
      players: {
        create: room.players.map((p, idx) => ({
          userId: users[idx].id,
          wpm: p.wpm,
          accuracy: p.accuracy,
          position: p.position ?? room.players.length,
        })),
      },
    },
  });
}

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on :${PORT}`);
});
