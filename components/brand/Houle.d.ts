import * as React from "react";
export interface HouleProps {
  /** Hauteur rendue en px (défaut 48) */
  height?: number;
  /** Une seule couleur (ex. "var(--hairline)") pour une houle discrète */
  mono?: string | null;
  style?: React.CSSProperties;
}
export declare function Houle(props: HouleProps): JSX.Element;
