import * as React from "react";
export interface TagProps {
  removable?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
}
export declare function Tag(props: TagProps): JSX.Element;
