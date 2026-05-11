"use client";

import { motion } from "framer-motion";
import { Car } from "./Car";
import { clsx } from "@/lib/utils";
import type { Player } from "@/types";

const COLORS = ["#22e8ff", "#ff2bd6", "#9dff4a", "#ffe14a", "#a07bff", "#ff8a3d"];

// Underdamped spring → the car carries momentum past the last typed char
// before settling, instead of stopping instantly.
const MOMENTUM_SPRING = {
  type: "spring" as const,
  stiffness: 45,
  damping: 15,
  mass: 1.8,
  restDelta: 0.001,
};

interface RaceTrackProps {
  players: Player[];
  selfId?: string;
}

export function RaceTrack({ players, selfId }: RaceTrackProps) {
  return (
    <div className="flex gap-2 sm:gap-3 h-[420px] sm:h-[520px]">
      {players.map((p, i) => {
        const color = COLORS[i % COLORS.length];
        const isSelf = p.id === selfId;
        // Progress goes 0..1. Map into the drivable region of the track
        // (leave a margin at top for the finish line and at bottom for spawn).
        const pct = Math.min(100, Math.max(0, p.progress * 100));

        return (
          <div
            key={p.id}
            className={clsx(
              "relative flex-1 min-w-0 rounded-lg border bg-panel/70 overflow-hidden flex flex-col",
              isSelf ? "border-neon-cyan/50" : "border-white/10"
            )}
          >
            {/* header — name + stats */}
            <div className="px-2 pt-2 pb-1 text-center font-mono">
              <div
                className="text-[11px] uppercase tracking-widest truncate"
                style={{ color }}
                title={p.username}
              >
                {p.username}
                {isSelf && <span className="text-white/40"> ·you</span>}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">
                {p.wpm} <span className="text-white/30">wpm</span>
                <span className="text-white/20 mx-1">·</span>
                {p.accuracy}<span className="text-white/30">%</span>
              </div>
            </div>

            {/* track */}
            <div className="relative flex-1 mx-2 mb-2 rounded-md bg-black/40 overflow-hidden border border-white/5">
              {/* finish line at the top */}
              <div className="absolute top-2 left-0 right-0 h-[3px] bg-white/70" />
              <div
                className="absolute top-2 left-0 right-0 h-[3px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.85) 0 6px, transparent 6px 12px)",
                }}
              />
              {/* center dashed lane stripe */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.12)_0_8px,transparent_8px_16px)]" />

              {/* car — bottom is anchored to progress (0% → bottom, 100% → finish line) */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: 0 }}
                animate={{ bottom: `calc(${pct}% * 0.88 + 6px)` }}
                transition={MOMENTUM_SPRING}
              >
                <Car color={color} label={p.finished ? `#${p.position ?? ""}` : undefined} />
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
