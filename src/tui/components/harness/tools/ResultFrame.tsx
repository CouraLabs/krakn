import type { ReactNode } from "react";
import type { RGBA } from "@opentui/core";

/**
 * The bordered column box every structured tool result is wrapped in,
 * except the plain-text cases (write, empty grep/find/ls) and the diff view.
 */
export const ResultFrame = (props: {
  borderColor: RGBA;
  children?: ReactNode;
}): ReactNode => (
  <box
    paddingX={2}
    flexDirection="column"
    width="100%"
    border={true}
    borderColor={props.borderColor}
  >
    {props.children}
  </box>
);
