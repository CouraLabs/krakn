import type { JSX } from "solid-js";
import type { RGBA } from "@opentui/core";
import { useAppStore } from "../../../../hooks/app-provider";
import { treeSitterClient } from "../../../../libs/treesitter";

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
export const CodeBlock = (props: CodeBlockProps): JSX.Element => {
  const { subtleSyntax } = useAppStore();
  const running = props.status === "running";
  return (
    <code
      syntaxStyle={subtleSyntax()}
      treeSitterClient={treeSitterClient}
      streaming={running}
      conceal={!running}
      filetype={props.filetype}
      content={props.content}
      {...(props.fg !== undefined ? { fg: props.fg } : {})}
    />
  );
};
