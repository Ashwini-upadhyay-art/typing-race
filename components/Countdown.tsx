"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CountdownProps {
  startsAt: number; // epoch ms
  onComplete?: () => void;
}

export function Countdown({ startsAt, onComplete }: CountdownProps) {
  const [n, setN] = useState<number>(() => Math.max(0, Math.ceil((startsAt - Date.now()) / 1000)));

  useEffect(() => {
    const id = window.setInterval(() => {
      const remaining = Math.ceil((startsAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setN(0);
        onComplete?.();
        window.clearInterval(id);
      } else {
        setN(remaining);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [startsAt, onComplete]);

  const label = n > 0 ? String(n) : "GO";

  return (
    <div className="flex items-center justify-center py-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="text-7xl sm:text-8xl font-mono font-bold text-neon-cyan animate-glow"
        >
          {label}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
