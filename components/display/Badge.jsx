import React from "react";

const TONES = {
  marine: { background: "var(--hgwf-marine)", color: "var(--hgwf-creme)" },
  ciel: { background: "var(--hgwf-ciel-lagune)", color: "var(--hgwf-marine)" },
  corail: { background: "var(--hgwf-corail-nacre)", color: "color-mix(in srgb, var(--hgwf-corail) 75%, var(--hgwf-marine))" },
  or: { background: "var(--hgwf-or-sable)", color: "color-mix(in srgb, var(--hgwf-or) 45%, var(--hgwf-marine))" },
};

export function Badge({ tone = "marine", mono = false, children }) {
  return (
    <span style={{
      fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
      fontSize: 12, fontWeight: mono ? 400 : 500, letterSpacing: mono ? "0.04em" : "0.08em",
      textTransform: mono ? "none" : "uppercase",
      padding: "4px 10px", borderRadius: "var(--radius-sm)",
      display: "inline-flex", alignItems: "center", gap: 6,
      ...TONES[tone] }}>
      {children}
    </span>
  );
}
