"use client";

import { motion } from "framer-motion";
import { clsx } from "@/lib/utils";

interface TypingAreaProps {
  passage: string;
  typed: string;
  hasMistake: boolean;
  disabled?: boolean;
}

export function TypingArea({ passage, typed, hasMistake, disabled }: TypingAreaProps) {
  return (
    <motion.div
      animate={hasMistake ? { x: [-2, 2, -1, 1, 0] } : { x: 0 }}
      transition={{ duration: 0.18 }}
      className={clsx(
        "rounded-lg border bg-panel/70 p-5 sm:p-6 font-mono text-lg sm:text-xl leading-relaxed tracking-wide",
        hasMistake ? "border-neon-pink/60 shadow-[0_0_18px_rgba(255,43,214,0.25)]" : "border-white/10",
        disabled && "opacity-60"
      )}
    >
      <p className="whitespace-pre-wrap break-words">
        {passage.split("").map((ch, i) => {
          let cls = "text-white/40";
          if (i < typed.length) {
            cls = typed[i] === ch ? "text-neon-cyan" : "text-neon-pink underline decoration-neon-pink";
          } else if (i === typed.length) {
            cls = "text-white bg-neon-cyan/20 border-b-2 border-neon-cyan animate-pulse";
          }
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </p>
    </motion.div>
  );
}
