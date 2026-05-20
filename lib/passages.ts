import type { Difficulty } from "../types";

export const PASSAGES: Record<Difficulty, string[]> = {
  easy: [
    "the quick brown fox jumps over the lazy dog while neon lights flicker softly above the road.",
    "code is poetry written for machines but read carefully by people every single day at work.",
    "racing through letters with quick fingers and a clear mind is the simplest way to win a race.",
    "small steady wins compound into a finish line that arrives sooner than you ever expected it.",
    "every keystroke counts on the keyboard so focus on the next word and trust your fast hands.",
  ],
  medium: [
    "The quick brown fox jumps over the lazy dog while neon lights flicker against the cold night sky and the city hums softly below the highway.",
    "Code is poetry written for machines but read by people, so we shape it with care, balance, and a sense of rhythm in every single line we write.",
    "Speed comes from accuracy. Every clean keystroke moves the car forward, while every mistake whispers a tiny tax on your hard-earned forward momentum.",
    "Racing through letters at the edge of a synthwave horizon, the keyboard glows and your fingers chase the next perfectly placed character on the road.",
    "Focus on the next word, not the entire passage. Small steady wins compound into a finishing line that arrives sooner than you ever expected.",
  ],
  hard: [
    "The neon-lit synthwave horizon flickered at 88 mph, casting long, electric shadows across the cracked asphalt; my fingers, restless and precise, raced toward the next checkpoint, 1,200 characters away, refusing to surrender a single keystroke to the howling, magnetic wind.",
    "In 1969, a Bell Labs engineer typed \"hello, world\", eleven characters that quietly rewired civilization. Half a century later, we still chase that same compact rush: pixels igniting under fingertips, semicolons clicking into place like seatbelts, and the cursor blinking, blinking, blinking.",
    "Accuracy is a discipline; speed is its reward. Mistype \"the\" as \"teh\" once and you'll wonder why; mistype it twice and you'll learn why; mistype it three times and the leaderboard, cold, unmoved, eternal, will quietly file you under \"almost\" and roll on without looking back.",
    "Vermilion taillights bled into the rain at 2:47 a.m., the dashboard reading 73 F, the radio whispering static-laced jazz; somewhere between the on-ramp and the exit, between the question and the answer, between the keystroke and the next, a small voice asked: how fast can you really go?",
  ],
};

export function pickPassage(difficulty: Difficulty = "medium"): string {
  const pool = PASSAGES[difficulty] ?? PASSAGES.medium;
  return pool[Math.floor(Math.random() * pool.length)];
}
