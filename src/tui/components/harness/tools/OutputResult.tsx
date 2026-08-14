import { Show } from "solid-js";
import { extractText } from "./content";
import { CodeBlock } from "./CodeBlock";
import { ResultFrame } from "./ResultFrame";
import type { ToolResultProps } from "./types";
import { useTui } from "../../../hooks/useTui";

type OutputResultProps = ToolResultProps & {
  /** Exact text that signals "nothing found" (e.g. "No matches found"). */
  emptyText: string;
  /** Builds truncation/limit notices from the tool's `details`. */
  warnings: (details: unknown) => string[];
};

/**
 * Shared rendering for the plain-output tools (grep, find, ls): a bordered
 * code block plus any truncation/limit notices. `emptyText` renders as a
 * muted one-liner instead of a bordered block.
 */
export const OutputResult = (props: OutputResultProps) => {
  const { theme } = useTui();
  const text = extractText(props.result?.content ?? []);
  if (text.trim() === props.emptyText) {
    return <text fg={theme().textMuted}>{props.emptyText}</text>;
  }
  const warnings = props.warnings(props.result?.details);
  return (
    <ResultFrame borderColor={theme().borderSubtle}>
      <CodeBlock status={props.status} filetype="text" content={text} />
      <Show when={warnings.length > 0}>
        <text fg={theme().warning}>[Truncated: {warnings.join(", ")}]</text>
      </Show>
    </ResultFrame>
  );
};
