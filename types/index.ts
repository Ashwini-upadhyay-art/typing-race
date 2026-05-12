export type RoomStatus = "waiting" | "countdown" | "racing" | "finished";

export type Difficulty = "easy" | "medium" | "hard";

export interface Player {
  id: string;
  username: string;
  joinedAt: number;
  progress: number; // 0..1
  wpm: number;
  accuracy: number; // 0..100
  finished: boolean;
  position?: number; // finishing order, 1-based
}

export interface RaceResult {
  roomCode: string;
  passage: string;
  difficulty: Difficulty;
  players: Player[];
  completedAt: number;
}

// Payloads that travel over Pusher client events.
export interface DifficultyEvent {
  difficulty: Difficulty;
}

export interface StartRaceEvent {
  passage: string;
  difficulty: Difficulty;
  startsAt: number; // epoch ms
}

export interface ProgressEvent {
  playerId: string;
  progress: number;
  wpm: number;
  accuracy: number;
}

export interface FinishEvent {
  playerId: string;
  wpm: number;
  accuracy: number;
  finishedAt: number;
}
