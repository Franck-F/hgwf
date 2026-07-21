import React from "react";

export function Input({ label, hint, mono = false, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-body)" }}>
      {label && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", letterSpacing: "0.02em" }}>{label}</span>}
      <input
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          fontSize: 15, color: "var(--fg)", background: "var(--bg)",
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          border: `1.5px solid ${focus ? "var(--accent-2)" : "var(--hairline)"}`,
          outline: "none", transition: "border-color var(--dur-out) var(--ease-out)",
          letterSpacing: mono ? "0.06em" : undefined, ...style,
        }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...rest}
      />
      {hint && <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{hint}</span>}
    </label>
  );
}
