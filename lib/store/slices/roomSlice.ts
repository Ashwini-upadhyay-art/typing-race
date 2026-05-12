import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Difficulty, Player, RoomStatus } from "@/types";

interface PresenceMember {
  id: string;
  username: string;
  joinedAt: number;
}

interface RoomState {
  code: string | null;
  selfId: string | null;
  status: RoomStatus;
  difficulty: Difficulty;
  passage: string;
  startsAt: number | null;
  finishedAt: number | null;
  players: Record<string, Player>;
  order: string[]; // player ids in stable lane order (by joinedAt)
}

const initialState: RoomState = {
  code: null,
  selfId: null,
  status: "waiting",
  difficulty: "medium",
  passage: "",
  startsAt: null,
  finishedAt: null,
  players: {},
  order: [],
};

function rebuildOrder(players: Record<string, Player>): string[] {
  return Object.values(players)
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
    .map((p) => p.id);
}

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    reset() {
      return initialState;
    },
    initRoom(
      state,
      action: PayloadAction<{
        code: string;
        selfId: string;
        members: PresenceMember[];
      }>
    ) {
      const { code, selfId, members } = action.payload;
      const isNewRoom = state.code !== code;
      state.code = code;
      state.selfId = selfId;

      // Reconcile presence list with existing player state — preserves
      // race progress/wpm/accuracy if we're re-subscribing mid-session
      // (e.g. during lobby → race navigation).
      const previous = state.players;
      state.players = {};
      for (const m of members) {
        state.players[m.id] =
          previous[m.id] ?? {
            id: m.id,
            username: m.username,
            joinedAt: m.joinedAt,
            progress: 0,
            wpm: 0,
            accuracy: 100,
            finished: false,
          };
      }
      state.order = rebuildOrder(state.players);

      if (isNewRoom) {
        state.status = "waiting";
        state.difficulty = "medium";
        state.passage = "";
        state.startsAt = null;
        state.finishedAt = null;
      }
    },
    memberAdded(state, action: PayloadAction<PresenceMember>) {
      const m = action.payload;
      if (state.players[m.id]) return;
      state.players[m.id] = {
        id: m.id,
        username: m.username,
        joinedAt: m.joinedAt,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
      };
      state.order = rebuildOrder(state.players);
    },
    memberRemoved(state, action: PayloadAction<string>) {
      delete state.players[action.payload];
      state.order = rebuildOrder(state.players);
    },
    setDifficulty(state, action: PayloadAction<Difficulty>) {
      if (state.status !== "waiting") return;
      state.difficulty = action.payload;
    },
    raceCountdown(
      state,
      action: PayloadAction<{ passage: string; difficulty: Difficulty; startsAt: number }>
    ) {
      state.status = "countdown";
      state.passage = action.payload.passage;
      state.difficulty = action.payload.difficulty;
      state.startsAt = action.payload.startsAt;
      // Reset per-race fields.
      for (const id of Object.keys(state.players)) {
        const p = state.players[id];
        p.progress = 0;
        p.wpm = 0;
        p.accuracy = 100;
        p.finished = false;
        p.position = undefined;
      }
    },
    raceStarted(state) {
      state.status = "racing";
    },
    updateProgress(
      state,
      action: PayloadAction<{ playerId: string; progress: number; wpm: number; accuracy: number }>
    ) {
      const p = state.players[action.payload.playerId];
      if (!p) return;
      p.progress = Math.max(0, Math.min(1, action.payload.progress));
      p.wpm = Math.max(0, Math.round(action.payload.wpm));
      p.accuracy = Math.max(0, Math.min(100, Math.round(action.payload.accuracy)));
    },
    markFinished(
      state,
      action: PayloadAction<{ playerId: string; wpm: number; accuracy: number }>
    ) {
      const p = state.players[action.payload.playerId];
      if (!p || p.finished) return;
      p.finished = true;
      p.progress = 1;
      p.wpm = Math.max(0, Math.round(action.payload.wpm));
      p.accuracy = Math.max(0, Math.min(100, Math.round(action.payload.accuracy)));
      const finishedCount = Object.values(state.players).filter((x) => x.finished).length;
      p.position = finishedCount;
      if (Object.values(state.players).every((x) => x.finished)) {
        state.status = "finished";
        state.finishedAt = Date.now();
      }
    },
  },
});

export const roomActions = roomSlice.actions;
export default roomSlice.reducer;

export type { RoomState as ReduxRoomState, PresenceMember };
