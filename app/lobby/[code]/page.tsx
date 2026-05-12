"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { PlayerCard } from "@/components/PlayerCard";
import { useAppSelector } from "@/lib/store/hooks";
import { useRoomChannel } from "@/hooks/useRoomChannel";
import { pickPassage } from "@/lib/passages";
import { clsx } from "@/lib/utils";
import type { Difficulty } from "@/types";

const COUNTDOWN_MS = 3000;

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: "easy", label: "Easy", desc: "~90 chars · short, gentle warm-up" },
  { id: "medium", label: "Medium", desc: "~150 chars · default sprint" },
  { id: "hard", label: "Hard", desc: "~300 chars · punctuation + numbers" },
];

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();

  const username = useAppSelector((s) => s.user.username);
  const room = useAppSelector((s) => s.room);
  const { emitDifficulty, emitStart } = useRoomChannel(code);

  const [copied, setCopied] = useState(false);

  // Send everyone to the race page when countdown starts.
  useEffect(() => {
    if (room.code === code && room.status === "countdown") {
      router.push(`/race/${code}`);
    }
  }, [room.status, room.code, code, router]);

  // If a player lands without a username, send them back to set one.
  useEffect(() => {
    if (!username) router.replace("/");
  }, [username, router]);

  const selfId = room.selfId;
  const hostId = room.order[0] ?? null;
  const isHost = !!selfId && selfId === hostId;
  const players = room.order.map((id) => room.players[id]).filter(Boolean);

  function handleStart() {
    if (!isHost) return;
    const passage = pickPassage(room.difficulty);
    emitStart({
      passage,
      difficulty: room.difficulty,
      startsAt: Date.now() + COUNTDOWN_MS,
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleLeave() {
    router.push("/");
  }

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
            Difficulty {isHost ? "" : "(host picks)"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => {
              const selected = room.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => isHost && emitDifficulty(d.id)}
                  disabled={!isHost}
                  className={clsx(
                    "rounded-md border px-2 py-3 text-left transition",
                    selected
                      ? "border-neon-cyan/70 bg-neon-cyan/10 shadow-neon"
                      : "border-white/10 bg-black/30 hover:border-white/30",
                    !isHost && "cursor-not-allowed",
                    !isHost && !selected && "opacity-40"
                  )}
                >
                  <div
                    className={clsx(
                      "font-mono uppercase tracking-widest text-xs",
                      selected ? "text-neon-cyan" : "text-white/80"
                    )}
                  >
                    {d.label}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 leading-tight">{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Players ({players.length})
          </div>
          <div className="space-y-2 min-h-[60px]">
            {players.length === 0 && (
              <div className="text-white/40 font-mono text-sm">Connecting...</div>
            )}
            {players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isHost={p.id === hostId}
                isSelf={p.id === selfId}
              />
            ))}
          </div>
        </div>

        <div className="pt-2">
          {isHost ? (
            <Button
              onClick={handleStart}
              className="w-full"
              disabled={players.length < 1}
            >
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
