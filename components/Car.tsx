"use client";

interface CarProps {
  color: string;
  label?: string;
}

// Top-down racing car, pointing UP (toward the finish line at the top of the track).
export function Car({ color, label }: CarProps) {
  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <div className="flex flex-col items-center">
      <svg
        width="34"
        height="60"
        viewBox="0 0 34 60"
        className="drop-shadow-[0_0_10px_currentColor]"
        style={{ color }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* wheels (drawn first so body overlaps) */}
        <rect x="1" y="12" width="5" height="10" rx="1.5" fill="#0a0a1a" stroke={color} strokeWidth="1.2" />
        <rect x="28" y="12" width="5" height="10" rx="1.5" fill="#0a0a1a" stroke={color} strokeWidth="1.2" />
        <rect x="1" y="40" width="5" height="10" rx="1.5" fill="#0a0a1a" stroke={color} strokeWidth="1.2" />
        <rect x="28" y="40" width="5" height="10" rx="1.5" fill="#0a0a1a" stroke={color} strokeWidth="1.2" />

        {/* body */}
        <path
          d="M8 6 L17 2 L26 6 L28 18 L28 48 L25 56 L9 56 L6 48 L6 18 Z"
          fill={`url(#${gradId})`}
          stroke={color}
          strokeWidth="1.2"
        />

        {/* windshield */}
        <path d="M10 14 L17 9 L24 14 L23 24 L11 24 Z" fill="rgba(7,7,19,0.85)" />
        {/* rear window */}
        <path d="M11 40 L23 40 L24 50 L10 50 Z" fill="rgba(7,7,19,0.55)" />

        {/* headlights */}
        <circle cx="11" cy="7" r="1.3" fill="#fff" opacity="0.9" />
        <circle cx="23" cy="7" r="1.3" fill="#fff" opacity="0.9" />
      </svg>
      {label && (
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/80 mt-0.5">
          {label}
        </div>
      )}
    </div>
  );
}
