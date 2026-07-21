import React from "react";

export function Radio({ label, name, value, checked, defaultChecked, onChange, disabled }) {
  const [c, setC] = React.useState(defaultChecked ?? false);
  const isC = checked ?? c;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer",
      fontFamily: "var(--font-body)", fontSize: 15, color: "var(--fg)", opacity: disabled ? 0.4 : 1 }}>
      <input type="radio" name={name} value={value} checked={isC} disabled={disabled}
        onChange={(e) => { setC(e.target.checked); onChange && onChange(e); }}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden="true" style={{
        width: 20, height: 20, borderRadius: "50%", boxSizing: "border-box", flexShrink: 0,
        background: "var(--bg)",
        border: isC ? "6px solid var(--hgwf-marine)" : "1.5px solid var(--hairline)",
        transition: "border var(--dur-out) var(--ease-out)" }} />
      {label}
    </label>
  );
}
