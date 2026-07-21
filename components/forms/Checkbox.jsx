import React from "react";

export function Checkbox({ label, checked, defaultChecked, onChange, disabled }) {
  const [c, setC] = React.useState(defaultChecked ?? false);
  const isC = checked ?? c;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer",
      fontFamily: "var(--font-body)", fontSize: 15, color: "var(--fg)", opacity: disabled ? 0.4 : 1 }}>
      <input type="checkbox" checked={isC} disabled={disabled}
        onChange={(e) => { setC(e.target.checked); onChange && onChange(e); }}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden="true" style={{
        width: 20, height: 20, borderRadius: "var(--radius-sm)", display: "inline-flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: isC ? "var(--hgwf-marine)" : "var(--bg)",
        border: `1.5px solid ${isC ? "var(--hgwf-marine)" : "var(--hairline)"}`,
        transition: "background var(--dur-out) var(--ease-out)" }}>
        {isC && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--hgwf-creme)" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>}
      </span>
      {label}
    </label>
  );
}
