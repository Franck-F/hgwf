import React from "react";

export function Card({ premium = false, radius = "md", style, children, ...rest }) {
  return (
    <div style={{
      fontFamily: "var(--font-body)",
      background: premium ? "var(--bg-premium)" : "var(--bg)",
      color: premium ? "var(--fg-on-dark)" : "var(--fg)",
      border: premium ? "none" : "1px solid var(--hairline)",
      borderRadius: radius === "lg" ? "var(--radius-lg)" : "var(--radius-md)",
      padding: "var(--space-6)", boxShadow: "var(--shadow-none)",
      ...style }} {...rest}>
      {children}
    </div>
  );
}
