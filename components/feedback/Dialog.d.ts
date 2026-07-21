import * as React from "react";
export interface DialogProps {
  open: boolean;
  /** Rendu en MAJUSCULES avec point final automatique */
  title?: string;
  onClose?: () => void;
  /** Boutons du pied — défaut : « Fermer » */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
