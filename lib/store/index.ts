import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import roomReducer from "./slices/roomSlice";

export function createAppStore() {
  return configureStore({
    reducer: {
      user: userReducer,
      room: roomReducer,
    },
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
