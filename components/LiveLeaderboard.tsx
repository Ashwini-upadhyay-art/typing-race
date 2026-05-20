"use client";

import { motion } from "framer-motion";
import { clsx } from "@/lib/utils";
import type { Player } from "@/types";

interface Props {
  players: Player[];
  selfId?: string | null;
  title?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

// Finished players sort by position (1st, 2nd, ...). Unfinished players
// sort by progress (further along = ranked higher), with wpm as tiebreak.
function rankPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.finished && b.finished) return (a.position ?? 99) - (b.position ?? 99);
    if (a.finished) return -1;
    if (b.finished) return 1;
    if (a.progress !== b.progress) return b.progress - a.progress;
    return b.wpm - a.wpm;
  });
}

export function LiveLeaderboard({ players, selfId, title = "Live Ranking" }: Props) {
  const sorted = rankPlayers(players);

  return (
    <div className="rounded-xl border border-white/10 bg-panel/70 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between text-[10px] uppercase tracking-widest font-mono">
        <span className="text-white/60">{title}</span>
        <span className="flex items-center gap-1.5 text-neon-lime/80">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-lime animate-pulse" />
          live
        </span>
      </div>
      <ul className="divide-y divide-white/5">
        {sorted.map((p, i) => {
          const isSelf = !!selfId && p.id === selfId;
          const displayRank = p.finished ? (p.position ?? i + 1) : i + 1;
          const rankLabel = p.finished
            ? MEDALS[displayRank - 1] ?? `#${displayRank}`
            : `#${displayRank}`;
          return (
            <motion.li
              key={p.id}
              layout
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className={clsx(
                "px-4 py-2.5 flex items-center gap-3 font-mono text-sm",
                isSelf && "bg-neon-cyan/5"
              )}
            >
              <span className="w-8 text-white/60 tabular-nums">{rankLabel}</span>
              <span className="flex-1 text-white truncate">
                {p.username}
                {isSelf && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-neon-cyan">
                    you
                  </span>
                )}
              </span>
              <span className="text-neon-cyan tabular-nums">
                {p.wpm}
                <span className="ml-1 text-[10px] text-white/40">wpm</span>
              </span>
              <span className="w-20 text-right text-white/60 tabular-nums">
                {p.finished ? "finished" : `${Math.round(p.progress * 100)}%`}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
