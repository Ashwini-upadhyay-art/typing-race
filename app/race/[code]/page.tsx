"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { RaceTrack } from "@/components/RaceTrack";
import { TypingArea } from "@/components/TypingArea";
import { useRoomChannel } from "@/hooks/useRoomChannel";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { roomActions } from "@/lib/store/slices/roomSlice";
import { userActions } from "@/lib/store/slices/userSlice";

export default function RacePage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const username = useAppSelector((s) => s.user.username);
  const room = useAppSelector((s) => s.room);
  const { emitProgress, emitFinish } = useRoomChannel(code);

  // Redirect home if username missing (e.g. direct nav).
  useEffect(() => {
    if (!username) router.replace("/");
  }, [username, router]);

  // Flip from countdown → racing locally once startsAt arrives.
  useEffect(() => {
    if (room.status !== "countdown" || !room.startsAt) return;
    const delay = room.startsAt - Date.now();
    const t = window.setTimeout(() => dispatch(roomActions.raceStarted()), Math.max(0, delay));
    return () => window.clearTimeout(t);
  }, [room.status, room.startsAt, dispatch]);

  // When the whole race finishes, persist a result to the user's history.
  // We stay on this page so the live leaderboard transitions naturally
  // into the final standings — no jarring redirect.
  const persistedRef = useRef(false);
  useEffect(() => {
    if (room.status !== "finished" || !room.code) return;
    if (persistedRef.current) return;
    persistedRef.current = true;
    const result = {
      roomCode: room.code,
      passage: room.passage,
      difficulty: room.difficulty,
      players: room.order
        .map((id) => room.players[id])
        .filter(Boolean)
        .sort((a, b) => {
          if (a.finished !== b.finished) return a.finished ? -1 : 1;
          return (a.position ?? 99) - (b.position ?? 99);
        }),
      completedAt: room.finishedAt ?? Date.now(),
    };
    dispatch(userActions.addRaceResult(result));
  }, [
    room.status,
    room.code,
    room.passage,
    room.difficulty,
    room.order,
    room.players,
    room.finishedAt,
    dispatch,
  ]);

  // Reset the persist guard if the user starts a new race (status flips
  // away from finished, e.g. via rematch).
  useEffect(() => {
    if (room.status === "racing" || room.status === "countdown") {
      persistedRef.current = false;
    }
  }, [room.status]);

  const racing = room.status === "racing";

  const onProgress = useCallback(
    (data: { progress: number; wpm: number; accuracy: number }) => {
      emitProgress(data);
    },
    [emitProgress]
  );
  const onFinish = useCallback(
    (data: { wpm: number; accuracy: number }) => {
      emitFinish(data);
    },
    [emitFinish]
  );

  const passage = room.passage;
  const engine = useTypingEngine({ passage, enabled: racing, onProgress, onFinish });

  const players = room.order.map((id) => room.players[id]).filter(Boolean);
  const self = room.selfId ? room.players[room.selfId] : undefined;
  const anyFinished = players.some((p) => p.finished);
  const allFinished = players.length > 0 && players.every((p) => p.finished);

  if (!room.code || room.code !== code) {
    return (
      <div className="text-white/60 font-mono text-sm py-20 text-center">Connecting...</div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
          Room {code}
        </div>
        <div className="flex items-center gap-4 font-mono">
          <Stat label="wpm" value={(self?.wpm ?? engine.wpm).toString()} color="text-neon-cyan" />
          <Stat label="acc" value={`${self?.accuracy ?? engine.accuracy}%`} color="text-neon-lime" />
        </div>
      </header>

      <RaceTrack players={players} selfId={room.selfId ?? undefined} />

      {room.status === "countdown" && room.startsAt && (
        <Countdown startsAt={room.startsAt} />
      )}

      {(room.status === "racing" || room.status === "finished") && !allFinished && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <TypingArea
            passage={passage}
            typed={engine.typed}
            hasMistake={engine.hasMistake}
            disabled={!racing || engine.finished}
          />
          <p className="text-center text-[10px] uppercase tracking-widest text-white/30 font-mono mt-3">
            {engine.finished
              ? "finished. keep watching the live ranking below."
              : engine.hasMistake
                ? "fix the red character (backspace)"
                : "type the passage. every correct keystroke moves your car."}
          </p>
        </motion.div>
      )}

      {anyFinished && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LiveLeaderboard
            players={players}
            selfId={room.selfId}
            title={allFinished ? "Final Standings" : "Live Ranking"}
          />
        </motion.div>
      )}

      {allFinished && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button onClick={() => router.push(`/lobby/${code}`)} className="flex-1 sm:flex-none sm:min-w-[180px]">
            Rematch in this room
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="flex-1 sm:flex-none sm:min-w-[180px]"
          >
            Back to home
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-right">
      <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}
