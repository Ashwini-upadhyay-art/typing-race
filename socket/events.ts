import type { Player, RoomState, RaceResult } from "@/types";

// Client → Server
export interface ClientToServerEvents {
  "room:join": (
    payload: { code: string; username: string },
    ack: (res: { ok: true; state: RoomState } | { ok: false; error: string }) => void
  ) => void;
  "room:leave": () => void;
  "race:start": () => void; // host only
  "race:progress": (payload: { progress: number; wpm: number; accuracy: number }) => void;
  "race:finish": (payload: { wpm: number; accuracy: number }) => void;
}

// Server → Client
export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:player_joined": (player: Player) => void;
  "room:player_left": (playerId: string) => void;
  "race:countdown": (state: RoomState) => void;
  "race:started": (state: RoomState) => void;
  "race:tick": (players: Player[]) => void;
  "race:finished": (result: RaceResult) => void;
  "error:message": (msg: string) => void;
}

export interface SocketData {
  playerId: string;
  username: string;
  roomCode?: string;
}
