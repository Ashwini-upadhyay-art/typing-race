import { pickPassage } from "../lib/passages";
import type { Difficulty, Player, RoomState, RoomStatus } from "../types";

const COUNTDOWN_MS = 3000;

export class RoomManager {
  private rooms = new Map<string, RoomState>();

  ensureRoom(code: string, hostIdFallback: string): RoomState {
    const upper = code.toUpperCase();
    const existing = this.rooms.get(upper);
    if (existing) return existing;
    const room: RoomState = {
      code: upper,
      hostId: hostIdFallback,
      status: "waiting",
      difficulty: "medium",
      passage: "",
      players: [],
    };
    this.rooms.set(upper, room);
    return room;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  addPlayer(code: string, player: Player): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    if (room.status !== "waiting") return undefined;
    if (room.players.find((p) => p.id === player.id)) return room;
    room.players.push(player);
    if (!room.hostId || !room.players.find((p) => p.id === room.hostId)) {
      room.hostId = player.id;
    }
    return room;
  }

  removePlayer(code: string, playerId: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return undefined;
    }
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
    return room;
  }

  setDifficulty(code: string, difficulty: Difficulty): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    if (room.status !== "waiting") return undefined;
    room.difficulty = difficulty;
    return room;
  }

  startCountdown(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    if (room.status !== "waiting") return undefined;
    room.passage = pickPassage(room.difficulty);
    room.status = "countdown";
    room.startsAt = Date.now() + COUNTDOWN_MS;
    return room;
  }

  setStatus(code: string, status: RoomStatus): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    room.status = status;
    if (status === "finished") {
      room.finishedAt = Date.now();
    }
    return room;
  }

  updateProgress(
    code: string,
    playerId: string,
    progress: number,
    wpm: number,
    accuracy: number
  ): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return undefined;
    player.progress = Math.max(0, Math.min(1, progress));
    player.wpm = Math.max(0, Math.round(wpm));
    player.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)));
    return room;
  }

  markFinished(
    code: string,
    playerId: string,
    wpm: number,
    accuracy: number
  ): { room: RoomState; allFinished: boolean } | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.finished) return undefined;
    player.finished = true;
    player.progress = 1;
    player.wpm = Math.max(0, Math.round(wpm));
    player.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)));
    player.position = room.players.filter((p) => p.finished).length;
    const allFinished = room.players.every((p) => p.finished);
    return { room, allFinished };
  }

  deleteRoom(code: string) {
    this.rooms.delete(code.toUpperCase());
  }
}

export const roomManager = new RoomManager();
