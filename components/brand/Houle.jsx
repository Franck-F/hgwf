import React from "react";

/* Séparateur « houle » — les deux vagues du logo, étirées sur la largeur. */
export function Houle({ height = 48, mono = null, style }) {
  const w1 = mono ?? "var(--hgwf-ciel)", w2 = mono ?? "var(--hgwf-corail)";
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"
      style={{ display: "block", width: "100%", height, ...style }}>
      <path d="M8 30 C 40 6, 80 6, 112 30 C 144 54, 184 54, 216 30 C 248 6, 288 6, 320 30 C 352 54, 376 50, 392 36"
        fill="none" stroke={w1} strokeWidth="7" strokeLinecap="round" />
      <path d="M8 48 C 40 24, 80 24, 112 48 C 144 72, 184 72, 216 48 C 248 24, 288 24, 320 48 C 352 72, 376 68, 392 54"
        fill="none" stroke={w2} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
