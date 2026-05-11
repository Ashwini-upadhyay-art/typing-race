import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070713",
        panel: "#0f0f23",
        neon: {
          pink: "#ff2bd6",
          cyan: "#22e8ff",
          lime: "#9dff4a",
          yellow: "#ffe14a",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        neon: "0 0 12px rgba(34,232,255,0.6), 0 0 32px rgba(255,43,214,0.25)",
      },
      keyframes: {
        glow: {
          "0%, 100%": { textShadow: "0 0 8px rgba(34,232,255,0.7)" },
          "50%": { textShadow: "0 0 18px rgba(255,43,214,0.9)" },
        },
      },
      animation: {
        glow: "glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
