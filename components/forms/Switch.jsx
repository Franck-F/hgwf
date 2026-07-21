import React from "react";

export function Switch({ label, checked, defaultChecked, onChange, disabled }) {
  const [c, setC] = React.useState(defaultChecked ?? false);
  const isC = checked ?? c;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer",
      fontFamily: "var(--font-body)", fontSize: 15, color: "var(--fg)", opacity: disabled ? 0.4 : 1 }}>
      <input type="checkbox" role="switch" checked={isC} disabled={disabled}
        onChange={(e) => { setC(e.target.checked); onChange && onChange(e); }}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden="true" style={{
        width: 40, height: 24, borderRadius: "var(--radius-pill)", padding: 3, boxSizing: "border-box",
        background: isC ? "var(--hgwf-marine)" : "color-mix(in srgb, var(--hgwf-marine) 20%, var(--hgwf-ivoire))",
        transition: "background var(--dur-out) var(--ease-out)", display: "inline-flex", flexShrink: 0 }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--hgwf-creme)",
          transform: isC ? "translateX(16px)" : "none",
          transition: "transform var(--dur-in) var(--ease-out)" }} />
      </span>
      {label}
    </label>
  );
}
