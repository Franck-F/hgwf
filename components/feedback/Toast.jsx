import React from "react";

const ACCENTS = { info: "var(--hgwf-ciel)", success: "var(--hgwf-or)", error: "var(--hgwf-corail)" };

export function Toast({ tone = "info", title, children }) {
  return (
    <div role="status" style={{
      fontFamily: "var(--font-body)", background: "var(--bg-premium)", color: "var(--fg-on-dark)",
      borderRadius: "var(--radius-md)", padding: "14px 18px", maxWidth: 380,
      display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "var(--shadow-quai)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENTS[tone], marginTop: 6, flexShrink: 0 }} />
      <div>
        {title && <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>}
        <div style={{ fontSize: 14, opacity: 0.85 }}>{children}</div>
      </div>
    </div>
  );
}
