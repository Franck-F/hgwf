import React from "react";

const S = {
  sm: { padding: "6px 14px", fontSize: 14 },
  md: { padding: "10px 20px", fontSize: 15 },
  lg: { padding: "14px 28px", fontSize: 16 },
};

export function Button({ variant = "primary", size = "md", onDark = false, disabled, children, ...rest }) {
  const base = {
    fontFamily: "var(--font-body)", fontWeight: 500, letterSpacing: "0.01em",
    border: "1.5px solid transparent", borderRadius: "var(--radius-md)",
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
    display: "inline-flex", alignItems: "center", gap: 8,
    transition: "background var(--dur-out) var(--ease-out), color var(--dur-out) var(--ease-out)",
    ...S[size],
  };
  const variants = {
    primary: { background: "var(--accent)", color: "var(--hgwf-creme)" },
    secondary: onDark
      ? { background: "transparent", color: "var(--fg-on-dark)", borderColor: "var(--hairline-dark)" }
      : { background: "transparent", color: "var(--fg)", borderColor: "var(--fg)" },
    ghost: { background: "transparent", color: onDark ? "var(--hgwf-or)" : "var(--accent)" },
  };
  const [hover, setHover] = React.useState(false);
  const hoverStyle = !disabled && hover
    ? variant === "primary" ? { background: "var(--accent-hover)" }
      : { background: onDark ? "rgba(251,244,230,0.08)" : "rgba(18,57,91,0.06)" }
    : {};
  return (
    <button disabled={disabled} style={{ ...base, ...variants[variant], ...hoverStyle }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} {...rest}>
      {children}
    </button>
  );
}
