import React from "react";

/* La marque « Balise » — dessinée inline pour hériter du contexte. */
function Mark({ size = 96, tail = "#FBF4E6", mono = null }) {
  const dots = mono ?? "#FBF4E6", arrow = mono ?? "#FFB23E",
    w1 = mono ?? "#4EA8DE", w2 = mono ?? "#FF6F5E", t = mono ?? tail;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
      <g fill={dots}>
        <circle cx="17" cy="50" r="2.6" /><circle cx="27" cy="43.5" r="3.1" />
        <circle cx="38" cy="38.5" r="3.6" /><circle cx="49.5" cy="35" r="4.1" />
      </g>
      <path d="M96 10 L64 31 L81 39 Z" fill={arrow} />
      <path d="M79 35 L71 52" stroke={t} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 68 C 20 53, 33 51, 44 61 C 55 71, 69 72, 81 60" fill="none" stroke={w1} strokeWidth="9" strokeLinecap="round" />
      <path d="M16 80 C 24 65, 37 63, 48 73 C 59 83, 73 84, 85 72" fill="none" stroke={w2} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

function Wordmark({ color, sub, scale = 1 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 * scale }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 34 * scale,
        lineHeight: 1, letterSpacing: "-0.01em", color }}>HGWF</span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 12 * scale,
        letterSpacing: "0.42em", color: sub, textTransform: "uppercase" }}>Cargo</span>
    </div>
  );
}

export function Logo({ variant = "badge", scale = 1 }) {
  if (variant === "embleme") {
    return (
      <div style={{ width: 96 * scale, height: 96 * scale, borderRadius: "50%", background: "var(--hgwf-marine)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mark size={76 * scale} />
      </div>
    );
  }
  if (variant === "mono") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16 * scale }}>
        <Mark size={64 * scale} mono="currentColor" />
        <Wordmark color="currentColor" sub="currentColor" scale={0.8 * scale} />
      </div>
    );
  }
  if (variant === "renverse") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 16 * scale, background: "var(--hgwf-creme)",
        border: "1px solid var(--hairline)", borderRadius: 24 * scale, padding: `${14 * scale}px ${24 * scale}px` }}>
        <Mark size={56 * scale} tail="#12395B" />
        <Wordmark color="var(--hgwf-marine)" sub="var(--hgwf-or)" scale={0.7 * scale} />
      </div>
    );
  }
  if (variant === "empile") {
    return (
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 * scale }}>
        <div style={{ width: 88 * scale, height: 88 * scale, borderRadius: "50%", background: "var(--hgwf-marine)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mark size={68 * scale} />
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24 * scale, color: "var(--hgwf-marine)" }}>HGWF</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10 * scale,
          letterSpacing: "0.42em", color: "var(--hgwf-or)", textTransform: "uppercase" }}>Cargo</span>
      </div>
    );
  }
  /* badge — version principale */
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 24 * scale, background: "var(--hgwf-marine)",
      borderRadius: 28 * scale, padding: `${18 * scale}px ${36 * scale}px ${18 * scale}px ${24 * scale}px` }}>
      <Mark size={80 * scale} />
      <Wordmark color="var(--hgwf-creme)" sub="var(--hgwf-or)" scale={scale} />
    </div>
  );
}
