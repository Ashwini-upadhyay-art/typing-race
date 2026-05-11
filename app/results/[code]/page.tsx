"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import type { RaceResult } from "@/types";

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();

  const [result, setResult] = useState<RaceResult | null>(null);

  useEffect(() => {
    const cached = window.sessionStorage.getItem(`nt:result:${code}`);
    if (cached) {
      try {
        setResult(JSON.parse(cached));
        return;
      } catch {
        // fall through
      }
    }
    // Fallback: fetch persisted results.
    fetch(`/api/results/${code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setResult(data))
      .catch(() => undefined);
  }, [code]);

  if (!result) {
    return <div className="text-white/60 font-mono text-sm py-20 text-center">Loading results...</div>;
  }

  const podium = result.players;
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
            {podium.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="border-t border-white/5"
              >
                <td className="px-4 py-3 text-white/60">
                  {medals[i] ?? `${i + 1}.`}
                </td>
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
