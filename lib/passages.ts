export const PASSAGES: string[] = [
  "The quick brown fox jumps over the lazy dog while neon lights flicker against the cold night sky and the city hums softly below.",
  "Code is poetry written for machines but read by people, so we shape it with care, balance, and a sense of rhythm in every single line.",
  "Speed comes from accuracy. Every clean keystroke moves the car forward, while every mistake whispers a tiny tax on your momentum.",
  "Racing through letters at the edge of a synthwave horizon, the keyboard glows and your fingers chase the next perfectly placed character.",
  "Focus on the next word, not the entire passage. Small steady wins compound into a finishing line that arrives sooner than you expected.",
];

export function pickPassage(): string {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
}
