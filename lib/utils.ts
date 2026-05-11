export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function clsx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return Math.round(correctChars / 5 / minutes);
}

export function calcAccuracy(correctChars: number, totalKeystrokes: number): number {
  if (totalKeystrokes === 0) return 100;
  return Math.round((correctChars / totalKeystrokes) * 100);
}
