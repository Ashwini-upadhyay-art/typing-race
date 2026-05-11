"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, ...rest },
  ref
) {
  const base =
    "inline-flex items-center justify-center font-mono uppercase tracking-widest text-xs sm:text-sm px-5 py-3 rounded-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const styles: Record<Variant, string> = {
    primary:
      "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/60 hover:bg-neon-cyan/20 hover:shadow-neon",
    ghost:
      "bg-transparent text-white/70 border border-white/15 hover:text-white hover:border-white/40",
    danger:
      "bg-neon-pink/10 text-neon-pink border border-neon-pink/60 hover:bg-neon-pink/20",
  };
  return <button ref={ref} className={clsx(base, styles[variant], className)} {...rest} />;
});
