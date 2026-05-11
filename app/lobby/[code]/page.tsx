"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { PlayerCard } from "@/components/PlayerCard";
import { useSocket } from "@/hooks/useSocket";
import type { RoomState } from "@/types";

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const socket = useSocket();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket || !code) return;
    const username = window.localStorage.getItem("nt:username") || "Racer";

    const join = () => {
      socket.emit("room:join", { code, username }, (res) => {
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setRoom(res.state);
      });
    };

    if (socket.connected) join();
    else socket.once("connect", join);

    socket.on("room:state", setRoom);
    socket.on("race:countdown", (state) => {
      setRoom(state);
      router.push(`/race/${code}`);
    });

    return () => {
      socket.off("room:state", setRoom);
      socket.off("race:countdown");
    };
  }, [socket, code, router]);

  function handleStart() {
    socket?.emit("race:start");
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleLeave() {
    socket?.emit("room:leave");
    router.push("/");
  }

  const selfId = socket?.id;
  const isHost = room && selfId && room.hostId === selfId;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <button
          onClick={handleLeave}
          className="text-white/40 hover:text-white text-sm font-mono uppercase tracking-widest"
        >
          ← Leave
        </button>
        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-neon-cyan">Lobby</h1>
        <div className="w-16" />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-panel/70 p-6 sm:p-8 space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Room code
          </div>
          <button
            onClick={handleCopy}
            className="text-4xl sm:text-5xl font-mono font-bold tracking-[0.4em] text-neon-pink hover:text-neon-cyan transition"
          >
            {code}
          </button>
          <div className="text-xs text-white/40 font-mono">
            {copied ? "Copied!" : "Tap to copy · share with friends"}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Players ({room?.players.length ?? 0})
          </div>
          <div className="space-y-2 min-h-[60px]">
            {!room && <div className="text-white/40 font-mono text-sm">Connecting...</div>}
            {room?.players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isHost={p.id === room.hostId}
                isSelf={p.id === selfId}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-neon-pink text-xs font-mono uppercase tracking-widest text-center">
            {error}
          </p>
        )}

        <div className="pt-2">
          {isHost ? (
            <Button onClick={handleStart} className="w-full" disabled={!room || room.players.length < 1}>
              Start race
            </Button>
          ) : (
            <p className="text-center text-white/40 text-xs font-mono uppercase tracking-widest">
              waiting for host to start...
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
