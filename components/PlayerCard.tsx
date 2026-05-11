"use client";

import { clsx } from "@/lib/utils";
import type { Player } from "@/types";

interface PlayerCardProps {
  player: Player;
  isHost?: boolean;
  isSelf?: boolean;
}

export function PlayerCard({ player, isHost, isSelf }: PlayerCardProps) {
  return (
    <div
      className={clsx(
        "rounded-md border bg-panel/70 px-4 py-3 flex items-center justify-between",
        isSelf ? "border-neon-cyan/60" : "border-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan font-mono text-sm">
          {player.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="font-mono">
          <div className="text-white text-sm">
            {player.username} {isSelf && <span className="text-white/40">(you)</span>}
          </div>
          {isHost && <div className="text-[10px] uppercase tracking-widest text-neon-pink">host</div>}
        </div>
      </div>
      <div className="font-mono text-xs text-white/40 uppercase tracking-widest">ready</div>
    </div>
  );
}
