import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RaceResult } from "@/types";

interface UserState {
  username: string;
  history: RaceResult[];
}

const initialState: UserState = {
  username: "",
  history: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    hydrate(_state, action: PayloadAction<UserState>) {
      return action.payload;
    },
    setUsername(state, action: PayloadAction<string>) {
      state.username = action.payload.trim().slice(0, 16);
    },
    addRaceResult(state, action: PayloadAction<RaceResult>) {
      // Keep last 20 races on this device.
      state.history.unshift(action.payload);
      state.history = state.history.slice(0, 20);
    },
    clearHistory(state) {
      state.history = [];
    },
  },
});

export const userActions = userSlice.actions;
export default userSlice.reducer;
