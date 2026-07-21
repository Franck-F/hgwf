import * as React from "react";
/** @startingPoint section="Forms" subtitle="Bouton HGWF — corail plein, contour marine, ghost" viewport="700x220" */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = corail plein (action). secondary = contour marine. ghost = texte seul. */
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  /** true quand le bouton vit sur fond marine */
  onDark?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
