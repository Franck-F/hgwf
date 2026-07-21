import React from "react";
import { Button } from "../forms/Button.jsx";

export function Dialog({ open, title, onClose, actions, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(18,57,91,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{
        fontFamily: "var(--font-body)", background: "var(--bg)", color: "var(--fg)",
        borderRadius: "var(--radius-lg)", padding: "var(--space-8)",
        width: "min(480px, calc(100vw - 48px))", boxShadow: "var(--shadow-quai)" }}>
        {title && <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: 22, textTransform: "uppercase", letterSpacing: "var(--tracking-tight)" }}>{title}.</h2>}
        <div style={{ marginTop: "var(--space-4)", fontSize: 15, lineHeight: 1.5 }}>{children}</div>
        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          {actions ?? <Button variant="secondary" onClick={onClose}>Fermer</Button>}
        </div>
      </div>
    </div>
  );
}
