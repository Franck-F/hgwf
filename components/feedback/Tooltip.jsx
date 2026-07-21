import React from "react";

export function Tooltip({ text, children }) {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span role="tooltip" style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--font-body)", fontSize: 12, whiteSpace: "nowrap",
          background: "var(--bg-premium)", color: "var(--fg-on-dark)",
          padding: "6px 10px", borderRadius: "var(--radius-sm)", zIndex: 50 }}>
          {text}
        </span>
      )}
    </span>
  );
}
