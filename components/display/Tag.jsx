import React from "react";

export function Tag({ removable = false, onRemove, children }) {
  return (
    <span style={{
      fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fg)",
      padding: "4px 12px", borderRadius: "var(--radius-pill)",
      border: "1px solid var(--hairline)", background: "var(--bg-soft)",
      display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
      {removable && (
        <button onClick={onRemove} aria-label="Retirer" style={{
          border: "none", background: "none", cursor: "pointer", padding: 0,
          color: "var(--fg-muted)", display: "inline-flex" }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </span>
  );
}
