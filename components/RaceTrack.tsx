"use client";

import { motion } from "framer-motion";
import { Car } from "./Car";
import { clsx } from "@/lib/utils";
import type { Player } from "@/types";

const COLORS = ["#22e8ff", "#ff2bd6", "#9dff4a", "#ffe14a", "#a07bff", "#ff8a3d"];

// Underdamped spring — gives the road and rival cars momentum / carry-through.
const SPRING = {
  type: "spring" as const,
  stiffness: 45,
  damping: 15,
  mass: 1.8,
  restDelta: 0.001,
};

// Self car stays fixed at this percentage from the bottom of the viewport.
const SELF_BOTTOM_PCT = 26;
// Full race spans this percentage of the viewport. Larger = more zoomed-in,
// smaller = more zoomed-out. 360% means the visible window covers ~28%
// of the race around the self player.
const RACE_SCALE_PCT = 360;
// How many pixels the road background scrolls over a full race. The pattern
// repeats every ~38px so the exact number is cosmetic — it just controls
// perceived speed.
const ROAD_PX_PER_RACE = 1400;
// Off-screen thresholds (in viewport %). A car is hidden if its top is
// below -8% (above viewport) or above 108% (below viewport).
const HIDE_ABOVE = -8;
const HIDE_BELOW = 108;

interface RaceTrackProps {
  players: Player[];
  selfId?: string;
}

interface PositionedCar {
  player: Player;
  color: string;
  xPct: number;
  topPct: number;
  deltaPct: number;
  isSelf: boolean;
}

function laneX(index: number, total: number): number {
  const n = Math.max(total, 1);
  return ((index + 0.5) / n) * 100;
}

export function RaceTrack({ players, selfId }: RaceTrackProps) {
  // Stable lane order — sort by id so the lanes don't shift when cars overtake.
  const byId = [...players].sort((a, b) => a.id.localeCompare(b.id));
  const self = byId.find((p) => p.id === selfId);
  const selfProg = self?.progress ?? 0;

  const ahead: PositionedCar[] = [];
  const behind: PositionedCar[] = [];
  const onTrack: PositionedCar[] = [];

  byId.forEach((p, i) => {
    const color = COLORS[i % COLORS.length];
    const xPct = laneX(i, byId.length);
    const isSelf = p.id === selfId;
    const topPct = 100 - SELF_BOTTOM_PCT - (p.progress - selfProg) * RACE_SCALE_PCT;
    const deltaPct = Math.round((p.progress - selfProg) * 100);
    const positioned: PositionedCar = { player: p, color, xPct, topPct, deltaPct, isSelf };

    if (isSelf) {
      onTrack.push(positioned);
    } else if (topPct < HIDE_ABOVE) {
      ahead.push(positioned);
    } else if (topPct > HIDE_BELOW) {
      behind.push(positioned);
    } else {
      onTrack.push(positioned);
    }
  });

  // Sort indicators by absolute distance — nearest first.
  ahead.sort((a, b) => b.deltaPct - a.deltaPct);
  behind.sort((a, b) => b.deltaPct - a.deltaPct);

  const finishTopPct = 100 - SELF_BOTTOM_PCT - (1 - selfProg) * RACE_SCALE_PCT;
  const startTopPct = 100 - SELF_BOTTOM_PCT + selfProg * RACE_SCALE_PCT;
  const roadOffset = selfProg * ROAD_PX_PER_RACE;

  return (
    <div className="relative h-[380px] sm:h-[520px] rounded-xl border border-white/10 overflow-hidden bg-gradient-to-b from-[#0a0a1f] via-[#0e0e26] to-[#08081a]">
      {/* Side rails with neon glow */}
      <div className="absolute inset-y-0 left-2 w-[2px] bg-gradient-to-b from-neon-cyan/60 via-white/10 to-neon-pink/60 shadow-[0_0_8px_rgba(34,232,255,0.4)]" />
      <div className="absolute inset-y-0 right-2 w-[2px] bg-gradient-to-b from-neon-pink/60 via-white/10 to-neon-cyan/60 shadow-[0_0_8px_rgba(255,43,214,0.4)]" />

      {/* Scrolling road — center dashed lane stripes that move with the camera */}
      <motion.div
        className="absolute inset-y-0 left-6 right-6 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.18) 0 14px, transparent 14px 42px)",
          backgroundSize: "1px 100%",
          backgroundRepeat: "repeat",
          backgroundPosition: "center 0px",
        }}
        animate={{ backgroundPositionY: `${roadOffset}px` }}
        transition={SPRING}
      />

      {/* Faint side speed lines */}
      <motion.div
        className="absolute inset-y-0 left-6 w-12 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(34,232,255,0.4) 0 4px, transparent 4px 28px)",
        }}
        animate={{ backgroundPositionY: `${roadOffset * 1.4}px` }}
        transition={SPRING}
      />
      <motion.div
        className="absolute inset-y-0 right-6 w-12 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,43,214,0.4) 0 4px, transparent 4px 28px)",
        }}
        animate={{ backgroundPositionY: `${roadOffset * 1.4}px` }}
        transition={SPRING}
      />

      {/* Start line — visible only at the start */}
      <motion.div
        className="absolute left-6 right-6 h-[2px] bg-white/40 z-0"
        initial={false}
        animate={{ top: `${Math.max(-10, Math.min(120, startTopPct))}%` }}
        transition={SPRING}
      />

      {/* Finish line — checkered, visible only near the end */}
      <motion.div
        className="absolute left-3 right-3 h-3 z-10 rounded-sm shadow-[0_0_14px_rgba(255,255,255,0.4)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0 10px, #0a0a1a 10px 20px)",
        }}
        initial={false}
        animate={{ top: `${Math.max(-10, Math.min(120, finishTopPct))}%` }}
        transition={SPRING}
      />

      {/* Cars on screen */}
      {onTrack.map(({ player, color, xPct, topPct, isSelf }) => (
        <motion.div
          key={player.id}
          className="absolute -translate-x-1/2 z-20 flex flex-col items-center"
          style={{ left: `${xPct}%` }}
          initial={false}
          animate={{ top: `${topPct}%` }}
          transition={isSelf ? { duration: 0 } : SPRING}
        >
          <div
            className="text-[10px] font-mono uppercase tracking-widest mb-1 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/60"
            style={{ color }}
          >
            {isSelf ? "YOU" : player.username}
            {player.finished && " 🏁"}
          </div>
          <Car color={color} />
        </motion.div>
      ))}

      {/* Off-screen indicators — players too far ahead */}
      {ahead.length > 0 && (
        <div className="absolute top-1 left-0 right-0 flex justify-center gap-3 z-30 pointer-events-none px-2">
          {ahead.map((c) => (
            <OffscreenIndicator key={c.player.id} direction="up" {...c} />
          ))}
        </div>
      )}

      {/* Off-screen indicators — players too far behind */}
      {behind.length > 0 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-3 z-30 pointer-events-none px-2">
          {behind.map((c) => (
            <OffscreenIndicator key={c.player.id} direction="down" {...c} />
          ))}
        </div>
      )}
    </div>
  );
}

function OffscreenIndicator({
  direction,
  player,
  color,
  deltaPct,
}: {
  direction: "up" | "down";
} & PositionedCar) {
  const arrow = direction === "up" ? "▲" : "▼";
  const sign = deltaPct >= 0 ? `+${deltaPct}` : `${deltaPct}`;
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 font-mono px-2 py-1 rounded-md bg-black/70 border",
        "leading-none"
      )}
      style={{ color, borderColor: color + "66" }}
    >
      {direction === "up" && <span className="text-xs">{arrow}</span>}
      <span className="text-[10px] uppercase tracking-widest">{player.username}</span>
      <span className="text-[10px] text-white/60">{sign}%</span>
      {direction === "down" && <span className="text-xs">{arrow}</span>}
    </div>
  );
}
