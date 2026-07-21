import React from "react";

export function Select({ label, options = [], ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-body)" }}>
      {label && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{label}</span>}
      <div style={{ position: "relative", display: "inline-flex" }}>
        <select
          style={{
            appearance: "none", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--fg)",
            background: "var(--bg)", padding: "10px 40px 10px 14px", borderRadius: "var(--radius-md)",
            border: `1.5px solid ${focus ? "var(--accent-2)" : "var(--hairline)"}`,
            outline: "none", width: "100%", cursor: "pointer",
          }}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...rest}>
          {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--fg-muted)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}
