"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Countdown } from "@/components/Countdown";
import { RaceTrack } from "@/components/RaceTrack";
import { TypingArea } from "@/components/TypingArea";
import { useSocket } from "@/hooks/useSocket";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import type { Player, RaceResult, RoomState } from "@/types";

export default function RacePage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const socket = useSocket();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!socket) return;

    // We may arrive here either from the lobby (already joined) or via direct nav.
    const ensureJoined = () => {
      if (!socket.id) return;
      const username = window.localStorage.getItem("nt:username") || "Racer";
      // Soft-join — server returns the current state regardless.
      socket.emit("room:join", { code, username }, (res) => {
        if (res.ok) {
          setRoom(res.state);
          setPlayers(res.state.players);
        }
      });
    };

    if (socket.connected) ensureJoined();
    else socket.once("connect", ensureJoined);

    const onState = (s: RoomState) => {
      setRoom(s);
      setPlayers(s.players);
    };
    const onTick = (ps: Player[]) => setPlayers(ps);
    const onStarted = (s: RoomState) => {
      setRoom(s);
      setPlayers(s.players);
    };
    const onFinished = (result: RaceResult) => {
      window.sessionStorage.setItem(`nt:result:${code}`, JSON.stringify(result));
      router.push(`/results/${code}`);
    };

    socket.on("room:state", onState);
    socket.on("race:tick", onTick);
    socket.on("race:started", onStarted);
    socket.on("race:finished", onFinished);

    return () => {
      socket.off("room:state", onState);
      socket.off("race:tick", onTick);
      socket.off("race:started", onStarted);
      socket.off("race:finished", onFinished);
    };
  }, [socket, code, router]);

  const racing = room?.status === "racing";

  const onProgress = useCallback(
    (data: { progress: number; wpm: number; accuracy: number }) => {
      socket?.emit("race:progress", data);
    },
    [socket]
  );

  const onFinish = useCallback(
    (data: { wpm: number; accuracy: number }) => {
      socket?.emit("race:finish", data);
    },
    [socket]
  );

  const passage = room?.passage ?? "";
  const engine = useTypingEngine({ passage, enabled: racing, onProgress, onFinish });

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.progress - a.progress),
    [players]
  );

  const self = players.find((p) => p.id === socket?.id);

  if (!room) {
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

      <RaceTrack players={sortedPlayers} selfId={socket?.id} />

      {room.status === "countdown" && room.startsAt && (
        <Countdown startsAt={room.startsAt} />
      )}

      {(room.status === "racing" || room.status === "finished") && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <TypingArea
            passage={passage}
            typed={engine.typed}
            hasMistake={engine.hasMistake}
            disabled={!racing}
          />
          <p className="text-center text-[10px] uppercase tracking-widest text-white/30 font-mono mt-3">
            {engine.finished
              ? "finished — waiting for others..."
              : engine.hasMistake
                ? "fix the red character (backspace)"
                : "type the passage — every correct keystroke moves your car"}
          </p>
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
