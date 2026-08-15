import { useContext, type ReactNode } from "react";
import type { RGBA } from "@opentui/core";
import { AppContext } from "../../../context/appContext";

type CodeBlockProps = {
  content: string;
  filetype?: string;
  /** Optional foreground color; omitted lets the syntax style decide. */
  fg?: RGBA;
  status: "running" | "done" | "error";
};

/**
 * The `<code>` renderable with the shared tool-result styling: streaming and
 * conceal follow the call status so output appears incrementally while a
 * running tool streams.
 */
export const CodeBlock = (props: CodeBlockProps): ReactNode => {
  const { syntax } = useContext(AppContext);
  const running = props.status === "running";
  return (
    <code
      syntaxStyle={syntax.muted}
      streaming={running}
      conceal={!running}
      filetype={props.filetype}
      content={props.content}
      {...(props.fg !== undefined ? { fg: props.fg } : {})}
    />
  );
};
