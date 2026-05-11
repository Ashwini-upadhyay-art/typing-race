export type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

export interface Player {
  id: string;
  username: string;
  progress: number; // 0..1
  wpm: number;
  accuracy: number; // 0..100
  finished: boolean;
  position?: number; // finishing order, 1-based
}

export interface RoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  passage: string;
  players: Player[];
  startsAt?: number; // epoch ms when countdown ends
  finishedAt?: number;
}

export interface RaceResult {
  roomCode: string;
  passage: string;
  players: Player[];
}
