"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/Button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { userActions } from "@/lib/store/slices/userSlice";

export default function LandingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const savedUsername = useAppSelector((s) => s.user.username);
  const [username, setUsername] = useState(savedUsername);
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local input with the hydrated Redux value once it lands.
  if (savedUsername && !username) {
    setUsername(savedUsername);
  }

  function saveName(name: string) {
    dispatch(userActions.setUsername(name));
  }

  async function handleCreate() {
    if (!username.trim()) {
      setError("Pick a username first");
      return;
    }
    saveName(username.trim());
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/room", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error ?? "Failed");
      router.push(`/lobby/${data.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
      setCreating(false);
    }
  }

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!username.trim()) {
      setError("Pick a username first");
      return;
    }
    if (trimmed.length !== 6) {
      setError("Room code must be 6 characters");
      return;
    }
    saveName(username.trim());
    router.push(`/lobby/${trimmed}`);
  }

  function handleSolo() {
    if (!username.trim()) {
      setError("Pick a username first");
      return;
    }
    saveName(username.trim());
    router.push("/solo");
  }

  return (
    <div className="space-y-12">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 pt-6"
      >
        <h1 className="text-5xl sm:text-7xl font-mono font-bold tracking-tighter">
          <span className="text-neon-cyan animate-glow">NEON</span>
          <span className="text-neon-pink">TYPE</span>
        </h1>
        <p className="text-white/60 text-sm sm:text-base font-mono">
          Multiplayer typing race · type fast, type clean
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/10 bg-panel/70 p-6 sm:p-8 space-y-6 max-w-md mx-auto"
      >
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-widest text-white/60 font-mono">
            Username
          </label>
          <input
            value={username}
            maxLength={16}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="speed-demon"
            className="w-full rounded-md bg-black/40 border border-white/10 px-4 py-3 font-mono text-white placeholder:text-white/30 focus:border-neon-cyan focus:outline-none focus:shadow-neon transition"
          />
        </div>

        <div className="space-y-3">
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create new room"}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ROOM CODE"
              className="flex-1 rounded-md bg-black/40 border border-white/10 px-4 py-3 font-mono uppercase tracking-widest text-white placeholder:text-white/30 focus:border-neon-pink focus:outline-none transition"
            />
            <Button variant="ghost" onClick={handleJoin}>
              Join
            </Button>
          </div>

          <Button variant="ghost" onClick={handleSolo} className="w-full">
            Solo · race the bot
          </Button>
        </div>

        {error && (
          <p className="text-neon-pink text-xs font-mono uppercase tracking-widest text-center">
            {error}
          </p>
        )}
      </motion.div>

      <footer className="text-center text-white/30 text-xs font-mono">
        ⌨️  ⚡  every keystroke counts
      </footer>
    </div>
  );
}
