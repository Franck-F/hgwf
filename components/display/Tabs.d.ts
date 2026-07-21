import * as React from "react";
export interface TabsProps {
  /** Chaînes simples ou { label, content } */
  tabs: Array<string | { label: string; content?: React.ReactNode }>;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  onDark?: boolean;
}
export declare function Tabs(props: TabsProps): JSX.Element;
