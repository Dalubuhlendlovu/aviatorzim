"use client";

import clsx from "clsx";

interface DogSpriteProps {
  running: boolean;
  crashed: boolean;
  multiplier: number;
}

/**
 * Fully CSS-animated inline SVG dog sprite.
 * Four-frame run cycle driven by a keyframe animation.
 * Motion-blur scales with the current multiplier.
 */
export function DogSprite({ running, crashed, multiplier }: DogSpriteProps) {
  // blur increases smoothly from 0 at 1x to ~8px at 10x
  const blurPx = Math.min(9, ((multiplier - 1) / 9) * 9).toFixed(1);
  const blurStyle = running ? { filter: `blur(${blurPx}px) drop-shadow(0 0 6px rgba(255,180,50,0.8))` } : {};

  return (
    <span
      className={clsx(
        "inline-block select-none",
        running && "dog-run",
        crashed && "dog-crash"
      )}
      style={blurStyle}
      aria-hidden="true"
    >
      {/* Simple side-view dog SVG – 5 frames faked via CSS rotation on limbs */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 80 56"
        width="80"
        height="56"
        fill="none"
      >
        {/* Body */}
        <ellipse cx="40" cy="32" rx="22" ry="10" fill="#d4a44c" />
        {/* Head */}
        <ellipse cx="60" cy="22" rx="11" ry="9" fill="#c48f3a" />
        {/* Snout */}
        <ellipse cx="69" cy="25" rx="5" ry="4" fill="#b87a2c" />
        {/* Nose */}
        <circle cx="73" cy="24" r="2" fill="#1a0a00" />
        {/* Eye */}
        <circle cx="64" cy="19" r="2" fill="#fff" />
        <circle cx="64.8" cy="19.3" r="1" fill="#1a0a00" />
        {/* Ear */}
        <ellipse cx="56" cy="14" rx="5" ry="3" fill="#b87a2c" transform="rotate(-20 56 14)" />
        {/* Tail */}
        <path d="M18 28 Q8 16 12 10" stroke="#c48f3a" strokeWidth="4" strokeLinecap="round" />
        {/* Front legs */}
        <line x1="50" y1="40" x2="46" y2="54" stroke="#c48f3a" strokeWidth="5" strokeLinecap="round" className="dog-front-leg-a" />
        <line x1="58" y1="40" x2="60" y2="54" stroke="#b87a2c" strokeWidth="5" strokeLinecap="round" className="dog-front-leg-b" />
        {/* Back legs */}
        <line x1="28" y1="40" x2="22" y2="54" stroke="#c48f3a" strokeWidth="5" strokeLinecap="round" className="dog-back-leg-a" />
        <line x1="34" y1="40" x2="36" y2="54" stroke="#b87a2c" strokeWidth="5" strokeLinecap="round" className="dog-back-leg-b" />
      </svg>
    </span>
  );
}
