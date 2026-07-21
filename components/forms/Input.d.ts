import * as React from "react";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Space Mono — pour numéros de conteneur, codes, coordonnées */
  mono?: boolean;
}
export declare function Input(props: InputProps): JSX.Element;
