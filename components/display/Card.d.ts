import * as React from "react";
/** @startingPoint section="Display" subtitle="Carte à trait fin — ou badge marine premium" viewport="700x260" */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fond marine plein, texte crème — le mode « badge » du logo */
  premium?: boolean;
  /** lg (24px) réservé aux surfaces badge/hero */
  radius?: "md" | "lg";
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): JSX.Element;
