import * as React from "react";
export interface BadgeProps {
  /** marine (statut fort) · ciel (info) · corail (alerte) · or (highlight) */
  tone?: "marine" | "ciel" | "corail" | "or";
  /** Space Mono, sans uppercase — pour codes */
  mono?: boolean;
  children?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
