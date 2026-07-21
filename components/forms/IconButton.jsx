import React from "react";

export function IconButton({ label, onDark = false, size = 40, children, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button aria-label={label} title={label}
      style={{
        width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: hover ? (onDark ? "rgba(251,244,230,0.1)" : "rgba(18,57,91,0.06)") : "transparent",
        color: onDark ? "var(--fg-on-dark)" : "var(--fg)",
        border: `1px solid ${onDark ? "var(--hairline-dark)" : "var(--hairline)"}`,
        borderRadius: "var(--radius-md)", cursor: "pointer",
        transition: "background var(--dur-out) var(--ease-out)",
      }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} {...rest}>
      {children}
    </button>
  );
}
