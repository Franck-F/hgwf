import React from "react";

export function Tabs({ tabs = [], defaultIndex = 0, onChange, onDark = false }) {
  const [i, setI] = React.useState(defaultIndex);
  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${onDark ? "var(--hairline-dark)" : "var(--hairline)"}` }}>
        {tabs.map((t, idx) => {
          const active = idx === i;
          return (
            <button key={idx} role="tab" aria-selected={active}
              onClick={() => { setI(idx); onChange && onChange(idx); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 16px", fontFamily: "inherit", fontSize: 14, fontWeight: active ? 700 : 400,
                color: active ? (onDark ? "var(--hgwf-or)" : "var(--fg)") : (onDark ? "var(--fg-on-dark)" : "var(--fg-muted)"),
                boxShadow: active ? `inset 0 -2px 0 ${onDark ? "var(--hgwf-or)" : "var(--accent)"}` : "none",
                transition: "color var(--dur-out) var(--ease-out)" }}>
              {t.label ?? t}
            </button>
          );
        })}
      </div>
      {tabs[i] && tabs[i].content && <div style={{ padding: "var(--space-4) 0" }}>{tabs[i].content}</div>}
    </div>
  );
}
