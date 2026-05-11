"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calcAccuracy, calcWpm } from "@/lib/utils";

interface UseTypingEngineParams {
  passage: string;
  enabled: boolean;
  onProgress?: (data: { progress: number; wpm: number; accuracy: number }) => void;
  onFinish?: (data: { wpm: number; accuracy: number }) => void;
}

interface TypingState {
  typed: string;
  correctChars: number;
  totalKeystrokes: number;
  wpm: number;
  accuracy: number;
  progress: number;
  finished: boolean;
  hasMistake: boolean;
}

export function useTypingEngine({
  passage,
  enabled,
  onProgress,
  onFinish,
}: UseTypingEngineParams) {
  const [state, setState] = useState<TypingState>({
    typed: "",
    correctChars: 0,
    totalKeystrokes: 0,
    wpm: 0,
    accuracy: 100,
    progress: 0,
    finished: false,
    hasMistake: false,
  });

  const startedAt = useRef<number | null>(null);
  const lastSent = useRef(0);

  // Reset whenever passage changes or the engine is re-enabled.
  useEffect(() => {
    setState({
      typed: "",
      correctChars: 0,
      totalKeystrokes: 0,
      wpm: 0,
      accuracy: 100,
      progress: 0,
      finished: false,
      hasMistake: false,
    });
    startedAt.current = null;
    lastSent.current = 0;
  }, [passage, enabled]);

  // Live WPM ticker — recompute every 500ms while racing.
  useEffect(() => {
    if (!enabled || state.finished) return;
    const id = window.setInterval(() => {
      setState((s) => {
        if (!startedAt.current) return s;
        const elapsed = Date.now() - startedAt.current;
        const wpm = calcWpm(s.correctChars, elapsed);
        return { ...s, wpm };
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [enabled, state.finished]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || state.finished) return;
      // Ignore modifier-only and non-printing keys.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Backspace allowed only to correct a wrong character at the cursor.
      if (e.key === "Backspace") {
        e.preventDefault();
        setState((s) => {
          if (s.typed.length === 0) return s;
          const last = s.typed[s.typed.length - 1];
          const expected = passage[s.typed.length - 1];
          // Only allow backspace when the last char was a mistake (forgiving correction).
          if (last === expected) return s;
          return {
            ...s,
            typed: s.typed.slice(0, -1),
            hasMistake: false,
          };
        });
        return;
      }

      if (e.key.length !== 1) return;
      e.preventDefault();

      setState((s) => {
        if (s.finished) return s;
        if (!startedAt.current) startedAt.current = Date.now();
        if (s.hasMistake) {
          // Force the user to correct mistakes before advancing further.
          return {
            ...s,
            totalKeystrokes: s.totalKeystrokes + 1,
          };
        }
        const nextIndex = s.typed.length;
        if (nextIndex >= passage.length) return s;

        const expected = passage[nextIndex];
        const correct = e.key === expected;
        const typed = s.typed + e.key;
        const correctChars = correct ? s.correctChars + 1 : s.correctChars;
        const totalKeystrokes = s.totalKeystrokes + 1;
        const progress = correctChars / passage.length;
        const elapsed = Date.now() - (startedAt.current ?? Date.now());
        const wpm = calcWpm(correctChars, elapsed);
        const accuracy = calcAccuracy(correctChars, totalKeystrokes);
        const finished = correct && typed.length === passage.length;

        return {
          typed,
          correctChars,
          totalKeystrokes,
          wpm,
          accuracy,
          progress,
          finished,
          hasMistake: !correct,
        };
      });
    },
    [enabled, passage, state.finished]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [enabled, handleKey]);

  // Emit progress (throttled to ~10Hz).
  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastSent.current < 100 && !state.finished) return;
    lastSent.current = now;
    onProgress?.({
      progress: state.progress,
      wpm: state.wpm,
      accuracy: state.accuracy,
    });
  }, [state.progress, state.wpm, state.accuracy, enabled, onProgress, state.finished]);

  // Fire finish event once.
  const finishFired = useRef(false);
  useEffect(() => {
    if (!enabled || !state.finished || finishFired.current) return;
    finishFired.current = true;
    onFinish?.({ wpm: state.wpm, accuracy: state.accuracy });
  }, [enabled, state.finished, state.wpm, state.accuracy, onFinish]);

  useEffect(() => {
    finishFired.current = false;
  }, [passage, enabled]);

  return state;
}
