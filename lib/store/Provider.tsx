"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { createAppStore, type AppStore } from "./index";
import { userActions } from "./slices/userSlice";

const STORAGE_KEY = "nt:user";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    // Hydrate user slice from localStorage on first mount.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          store.dispatch(
            userActions.hydrate({
              username: typeof parsed.username === "string" ? parsed.username : "",
              history: Array.isArray(parsed.history) ? parsed.history : [],
            })
          );
        }
      }
    } catch {
      // Ignore corrupt storage.
    }

    // Persist user slice back to localStorage on every change.
    return store.subscribe(() => {
      try {
        const { user } = store.getState();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch {
        // Ignore storage quota errors.
      }
    });
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
