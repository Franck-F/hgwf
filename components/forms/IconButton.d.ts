import * as React from "react";
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Libellé accessible (aria-label) — obligatoire */
  label: string;
  onDark?: boolean;
  /** Côté en px (défaut 40) */
  size?: number;
  /** L'icône (Lucide 20px conseillé) */
  children?: React.ReactNode;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
