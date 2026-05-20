"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { RaceTrack } from "@/components/RaceTrack";
import { TypingArea } from "@/components/TypingArea";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { pickPassage } from "@/lib/passages";
import { clsx } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { userActions } from "@/lib/store/slices/userSlice";
import type { Difficulty, Player, RaceResult } from "@/types";

type Phase = "pick" | "countdown" | "racing" | "finished";

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: "easy", label: "Easy", desc: "~90 chars · short warm-up" },
  { id: "medium", label: "Medium", desc: "~150 chars · default sprint" },
  { id: "hard", label: "Hard", desc: "~300 chars · punctuation + numbers" },
];

const COUNTDOWN_MS = 3000;
const BOT_TICK_MS = 100;
const SELF_ID = "self";
const BOT_ID = "bot";

// Bot is set just above the player's best so each race nudges the ceiling.
// +5 WPM challenge feels firm without being demoralising; the floor of 30
// keeps the bot interesting for total beginners.
function botTargetWpm(best: number): number {
  if (best <= 0) return 35;
  return Math.max(30, best + 5);
}

// Find the highest WPM this player has clocked across saved races (any
// mode). Matched by username case-insensitively. Only finished runs count.
function bestWpmFromHistory(
  history: RaceResult[],
  username: string
): number {
  const me = username.trim().toLowerCase();
  if (!me) return 0;
  let best = 0;
  for (const h of history) {
    for (const p of h.players) {
      if (!p.finished) continue;
      if (p.username.toLowerCase() !== me) continue;
      if (p.wpm > best) best = p.wpm;
    }
  }
  return best;
}

export default function SoloPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const username = useAppSelector((s) => s.user.username);
  const history = useAppSelector((s) => s.user.history);

  useEffect(() => {
    if (!username) router.replace("/");
  }, [username, router]);

  const best = useMemo(() => bestWpmFromHistory(history, username), [history, username]);
  const target = botTargetWpm(best);

  const [phase, setPhase] = useState<Phase>("pick");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [passage, setPassage] = useState("");
  const [startsAt, setStartsAt] = useState<number | null>(null);
  // Frozen bot target for the in-progress race. `target` (derived from history)
  // jumps the moment we persist this race's result, so the modal would otherwise
  // show a different bot wpm than the one we actually raced against.
  const [activeTarget, setActiveTarget] = useState(0);

  // Snapshots we keep outside useTypingEngine so they survive after the
  // engine resets on `enabled: false` at end of race.
  const [selfSnap, setSelfSnap] = useState({
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finished: false,
  });
  const [botSnap, setBotSnap] = useState({ progress: 0, finished: false });
  const finishOrderRef = useRef<string[]>([]);

  const racing = phase === "racing";
  const engine = useTypingEngine({ passage, enabled: racing });

  // Mirror engine state into the snapshot while racing. Once the phase
  // leaves "racing" the snapshot freezes — that's what we render in the
  // results table.
  useEffect(() => {
    if (phase !== "racing") return;
    setSelfSnap({
      progress: engine.progress,
      wpm: engine.wpm,
      accuracy: engine.accuracy,
      finished: engine.finished,
    });
  }, [phase, engine.progress, engine.wpm, engine.accuracy, engine.finished]);

  // Bot loop — deterministic ticker scaled by the frozen race target.
  useEffect(() => {
    if (!racing || !startsAt || !passage || !activeTarget) return;
    const id = window.setInterval(() => {
      const elapsedMin = Math.max(0, (Date.now() - startsAt) / 60000);
      const targetChars = activeTarget * 5 * elapsedMin;
      const next = Math.min(1, targetChars / passage.length);
      setBotSnap((s) => {
        if (s.finished) return s;
        const finished = next >= 1;
        if (finished && !finishOrderRef.current.includes(BOT_ID)) {
          finishOrderRef.current.push(BOT_ID);
        }
        return { progress: next, finished };
      });
    }, BOT_TICK_MS);
    return () => window.clearInterval(id);
  }, [racing, startsAt, activeTarget, passage]);

  // Record self finish order.
  useEffect(() => {
    if (!engine.finished) return;
    if (!finishOrderRef.current.includes(SELF_ID)) {
      finishOrderRef.current.push(SELF_ID);
    }
  }, [engine.finished]);

  // Flip countdown → racing when startsAt arrives.
  useEffect(() => {
    if (phase !== "countdown" || !startsAt) return;
    const t = window.setTimeout(
      () => setPhase("racing"),
      Math.max(0, startsAt - Date.now())
    );
    return () => window.clearTimeout(t);
  }, [phase, startsAt]);

  // End the race when both racers are done.
  useEffect(() => {
    if (phase !== "racing") return;
    if (!selfSnap.finished || !botSnap.finished) return;
    setPhase("finished");
  }, [phase, selfSnap.finished, botSnap.finished]);

  // Persist a RaceResult once we hit the finished phase.
  const persistedRef = useRef(false);
  useEffect(() => {
    if (phase !== "finished" || persistedRef.current) return;
    persistedRef.current = true;
    const selfPos = finishOrderRef.current.indexOf(SELF_ID);
    const botPos = finishOrderRef.current.indexOf(BOT_ID);
    const players: Player[] = [
      {
        id: SELF_ID,
        username,
        joinedAt: 0,
        progress: selfSnap.progress,
        wpm: selfSnap.wpm,
        accuracy: selfSnap.accuracy,
        finished: selfSnap.finished,
        position: selfPos >= 0 ? selfPos + 1 : undefined,
      },
      {
        id: BOT_ID,
        username: `Bot (${activeTarget} wpm)`,
        joinedAt: 1,
        progress: botSnap.progress,
        wpm: activeTarget,
        accuracy: 100,
        finished: botSnap.finished,
        position: botPos >= 0 ? botPos + 1 : undefined,
      },
    ];
    dispatch(
      userActions.addRaceResult({
        roomCode: "SOLO",
        passage,
        difficulty,
        players,
        completedAt: Date.now(),
      })
    );
  }, [
    phase,
    username,
    passage,
    difficulty,
    activeTarget,
    selfSnap,
    botSnap,
    dispatch,
  ]);

  function startRace() {
    const p = pickPassage(difficulty);
    setPassage(p);
    setSelfSnap({ progress: 0, wpm: 0, accuracy: 100, finished: false });
    setBotSnap({ progress: 0, finished: false });
    finishOrderRef.current = [];
    persistedRef.current = false;
    setActiveTarget(target);
    setStartsAt(Date.now() + COUNTDOWN_MS);
    setPhase("countdown");
  }

  function rematch() {
    setPhase("pick");
    setPassage("");
    setStartsAt(null);
  }

  // Build the players list the RaceTrack and LiveLeaderboard expect.
  // Position is derived from finishOrderRef so medals reflect actual
  // finish order, not the natural array order.
  const players: Player[] = useMemo(() => {
    const order = finishOrderRef.current;
    const selfPos = order.indexOf(SELF_ID);
    const botPos = order.indexOf(BOT_ID);
    return [
      {
        id: SELF_ID,
        username: username || "You",
        joinedAt: 0,
        progress: selfSnap.progress,
        wpm: selfSnap.wpm,
        accuracy: selfSnap.accuracy,
        finished: selfSnap.finished,
        position: selfSnap.finished && selfPos >= 0 ? selfPos + 1 : undefined,
      },
      {
        id: BOT_ID,
        username: `Bot (${activeTarget} wpm)`,
        joinedAt: 1,
        progress: botSnap.progress,
        wpm: activeTarget,
        accuracy: 100,
        finished: botSnap.finished,
        position: botSnap.finished && botPos >= 0 ? botPos + 1 : undefined,
      },
    ];
  }, [username, selfSnap, botSnap, activeTarget]);

  const anyFinished = selfSnap.finished || botSnap.finished;

  // ---- pick screen ----------------------------------------------------
  if (phase === "pick") {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-white/40 hover:text-white text-sm font-mono uppercase tracking-widest"
          >
            ← Leave
          </button>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-neon-cyan">
            Solo · vs Bot
          </h1>
          <div className="w-16" />
        </header>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-panel/70 p-6 sm:p-8 space-y-6 max-w-md mx-auto"
        >
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Your best" value={best > 0 ? `${best}` : "—"} unit="wpm" color="text-neon-cyan" />
            <Stat label="Bot target" value={`${target}`} unit="wpm" color="text-neon-pink" />
          </div>
          <p className="text-center text-[11px] text-white/40 font-mono leading-snug">
            {best > 0
              ? "Bot races just above your personal best to push your ceiling."
              : "No history yet — bot starts at a gentle 35 WPM. Beat it and your next bot levels up."}
          </p>

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              Difficulty
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => {
                const selected = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={clsx(
                      "rounded-md border px-2 py-3 text-left transition",
                      selected
                        ? "border-neon-cyan/70 bg-neon-cyan/10 shadow-neon"
                        : "border-white/10 bg-black/30 hover:border-white/30"
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
                    <div className="text-[10px] text-white/40 mt-1 leading-tight">
                      {d.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={startRace} className="w-full">
            Start race
          </Button>
        </motion.div>
      </div>
    );
  }

  // ---- countdown / racing / finished ---------------------------------
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
          Solo · vs Bot ({activeTarget} wpm)
        </div>
        <div className="flex items-center gap-4 font-mono">
          <Stat label="wpm" value={selfSnap.wpm.toString()} color="text-neon-cyan" />
          <Stat label="acc" value={`${selfSnap.accuracy}%`} color="text-neon-lime" />
        </div>
      </header>

      <RaceTrack players={players} selfId={SELF_ID} />

      {phase === "countdown" && startsAt && <Countdown startsAt={startsAt} />}

      {(phase === "racing" || phase === "finished") && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <TypingArea
            passage={passage}
            typed={engine.typed}
            hasMistake={engine.hasMistake}
            disabled={!racing || engine.finished}
          />
          <p className="text-center text-[10px] uppercase tracking-widest text-white/30 font-mono mt-3">
            {phase === "finished"
              ? selfSnap.finished
                ? "race over"
                : "race over. bot won."
              : engine.finished
                ? "finished. waiting for bot to cross..."
                : engine.hasMistake
                  ? "fix the red character (backspace)"
                  : "type the passage. every correct keystroke moves your car."}
          </p>
        </motion.div>
      )}

      {anyFinished && phase !== "finished" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LiveLeaderboard players={players} selfId={SELF_ID} />
        </motion.div>
      )}

      <AnimatePresence>
        {phase === "finished" && (
          <ResultsModal
            selfSnap={selfSnap}
            botSnap={botSnap}
            target={activeTarget}
            username={username || "You"}
            finishOrder={finishOrderRef.current}
            onRematch={rematch}
            onHome={() => router.push("/")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
}) {
  return (
    <div className="text-right">
      <div className={`text-xl sm:text-2xl font-bold ${color}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-white/40">{unit}</span>}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}

function ResultsModal({
  selfSnap,
  botSnap,
  target,
  username,
  finishOrder,
  onRematch,
  onHome,
}: {
  selfSnap: { progress: number; wpm: number; accuracy: number; finished: boolean };
  botSnap: { progress: number; finished: boolean };
  target: number;
  username: string;
  finishOrder: string[];
  onRematch: () => void;
  onHome: () => void;
}) {
  const rows = [
    {
      id: SELF_ID,
      name: username,
      wpm: selfSnap.wpm,
      acc: selfSnap.accuracy,
      finished: selfSnap.finished,
      pos: finishOrder.indexOf(SELF_ID),
    },
    {
      id: BOT_ID,
      name: `Bot (${target} wpm)`,
      wpm: target,
      acc: 100,
      finished: botSnap.finished,
      pos: finishOrder.indexOf(BOT_ID),
    },
  ].sort((a, b) => {
    const ap = a.pos < 0 ? 99 : a.pos;
    const bp = b.pos < 0 ? 99 : b.pos;
    return ap - bp;
  });

  const medals = ["🥇", "🥈"];
  const won = finishOrder[0] === SELF_ID;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-panel/95 shadow-[0_0_40px_rgba(34,232,255,0.15)] p-6 sm:p-8 space-y-5"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Final Standings
          </div>
          <h2
            className={clsx(
              "text-3xl sm:text-4xl font-mono font-bold animate-glow",
              won ? "text-neon-lime" : "text-neon-pink"
            )}
          >
            {won ? "You win" : "Bot wins"}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
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
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white/60">
                    {medals[i] ?? `${i + 1}.`}
                  </td>
                  <td className="px-4 py-3 text-white">{r.name}</td>
                  <td className="px-4 py-3 text-right text-neon-cyan">{r.wpm}</td>
                  <td className="px-4 py-3 text-right text-neon-lime">{r.acc}%</td>
                  <td className="px-4 py-3 text-right text-white/60">
                    {r.finished ? "finished" : "dnf"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
          <Button onClick={onRematch} className="flex-1">
            Race again
          </Button>
          <Button variant="ghost" onClick={onHome} className="flex-1">
            Back to home
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
