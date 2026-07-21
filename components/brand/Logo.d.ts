import * as React from "react";
/** @startingPoint section="Brand" subtitle="Logo Balise — badge, empilé, emblème, renversé, mono" viewport="700x320" */
export interface LogoProps {
  /** Ordre d'usage : badge → empile → embleme → renverse → mono */
  variant?: "badge" | "empile" | "embleme" | "renverse" | "mono";
  /** Facteur d'échelle (1 = badge ~360px de large) */
  scale?: number;
}
export declare function Logo(props: LogoProps): JSX.Element;
