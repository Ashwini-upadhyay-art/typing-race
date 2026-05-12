"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { useAppSelector } from "@/lib/store/hooks";

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();

  // Prefer the live room (just-finished race), fall back to the user's
  // persisted history (e.g. after a hard refresh).
  const room = useAppSelector((s) => s.room);
  const history = useAppSelector((s) => s.user.history);

  const result = useMemo(() => {
    if (room.code === code && room.status === "finished" && room.order.length > 0) {
      return {
        roomCode: room.code,
        passage: room.passage,
        difficulty: room.difficulty,
        players: room.order
          .map((id) => room.players[id])
          .sort((a, b) => {
            if (a.finished !== b.finished) return a.finished ? -1 : 1;
            return (a.position ?? 99) - (b.position ?? 99);
          }),
      };
    }
    const past = history.find((h) => h.roomCode === code);
    if (past) return past;
    return null;
  }, [room, history, code]);

  if (!result) {
    return (
      <div className="text-white/60 font-mono text-sm py-20 text-center">
        No results found for this room. <br />
        <Button variant="ghost" onClick={() => router.push("/")} className="mt-6">
          Back to landing
        </Button>
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
          Race {code}
          {"difficulty" in result && (
            <span className="ml-2 text-white/30">· {result.difficulty}</span>
          )}
        </div>
        <h1 className="text-4xl sm:text-5xl font-mono font-bold text-neon-cyan animate-glow">
          Final Standings
        </h1>
      </motion.header>

      <div className="rounded-xl border border-white/10 bg-panel/70 overflow-hidden">
        <table className="w-full font-mono text-sm">
          <thead className="bg-black/40 text-white/40 uppercase tracking-widest text-[10px]">
            <tr>
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Player</th>
              <th className="text-right px-4 py-3">WPM</th>
              <th className="text-right px-4 py-3">Accuracy</th>
              <th className="text-right px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.players.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="border-t border-white/5"
              >
                <td className="px-4 py-3 text-white/60">{medals[i] ?? `${i + 1}.`}</td>
                <td className="px-4 py-3 text-white">{p.username}</td>
                <td className="px-4 py-3 text-right text-neon-cyan">{p.wpm}</td>
                <td className="px-4 py-3 text-right text-neon-lime">{p.accuracy}%</td>
                <td className="px-4 py-3 text-right text-white/60">
                  {p.finished ? "finished" : "dnf"}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" onClick={() => router.push("/")}>
          New race
        </Button>
        <Button variant="ghost" onClick={() => router.push(`/lobby/${code}`)}>
          Rematch in this room
        </Button>
      </div>
    </div>
  );
}
