import { useContext, type ReactNode } from "react";
import { extractText } from "./content";
import { AppContext } from "../../../context/appContext";
import { argFiletype } from "./filetype";
import { grepWarnings, findWarnings, lsWarnings } from "./warnings";
import { CodeBlock } from "./CodeBlock";
import { ResultFrame } from "./ResultFrame";
import { BashResult } from "./BashResult";
import { ReadResult } from "./ReadResult";
import { EditResult } from "./EditResult";
import { WriteResult } from "./WriteResult";
import { OutputResult } from "./OutputResult";
import { MarkdownResult } from "./MarkdownResult";
import type { ToolResultProps } from "./types";

/**
 * Render the expanded result body for one tool call.
 *
 * The pi coding-agent SDK tools each return an `AgentToolResult`
 * (`{ content: (TextContent|ImageContent)[]; details: T }`). The provider
 * stores `result.content` + `result.details` verbatim on the ChatBlock; this
 * dispatcher maps each known tool name to its structured rendering (diffs
 * for edit, truncation metadata for the output tools, plain text for the
 * rest) and falls back to markdown for unknown tools.
 */
export const renderToolResult = (props: ToolResultProps): ReactNode => {
  const { theme } = useContext(AppContext);
  const text = extractText(props.result?.content ?? []);

  // Still running and nothing streamed yet.
  if (props.status === "running" && !props.result) {
    return <text fg={theme.info}>running…</text>;
  }

  // Error: bash throws `Command exited with code N` (bash.js:343), edit and
  // the other tools surface their error message in content[].text.
  if (props.isError) {
    return (
      <ResultFrame borderColor={theme.error}>
        <CodeBlock
          status={props.status}
          filetype={argFiletype(props.args) ?? "text"}
          fg={theme.error}
          content={text || "(no output)"}
        />
      </ResultFrame>
    );
  }

  switch (props.name) {
    case "bash":
      return <BashResult {...props} />;
    case "read":
      return <ReadResult {...props} />;
    case "edit":
      return <EditResult {...props} />;
    case "write":
      return <WriteResult {...props} />;
    case "grep":
      return <OutputResult {...props} emptyText="No matches found" warnings={grepWarnings} />;
    case "find":
      return (
        <OutputResult
          {...props}
          emptyText="No files found matching pattern"
          warnings={findWarnings}
        />
      );
    case "glob":
      return <OutputResult {...props} emptyText="No files found matching pattern" warnings={findWarnings} />;
    case "ls":
      return <OutputResult {...props} emptyText="(empty directory)" warnings={lsWarnings} />;
    default:
      return <MarkdownResult {...props} />;
  }
};
