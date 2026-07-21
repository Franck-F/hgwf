import * as React from "react";
export interface ToastProps {
  /** point ciel (info) · or (succès) · corail (erreur) */
  tone?: "info" | "success" | "error";
  title?: string;
  children?: React.ReactNode;
}
export declare function Toast(props: ToastProps): JSX.Element;
