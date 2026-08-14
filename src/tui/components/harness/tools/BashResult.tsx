import { Show } from "solid-js";
import { extractText } from "./content";
import { bashWarnings } from "./warnings";
import { CodeBlock } from "./CodeBlock";
import { ResultFrame } from "./ResultFrame";
import type { ToolResultProps } from "./types";
import { useTui } from "../../../hooks/useTui";

export const BashResult = (props: ToolResultProps) => {
  const { theme } = useTui();
  const text = extractText(props.result?.content ?? []);
  const warnings = bashWarnings(props.result?.details);
  return (
    <ResultFrame borderColor={theme().borderSubtle}>
      <CodeBlock status={props.status} filetype="text" content={text || "(no output)"} />
      <Show when={warnings.length > 0}>
        <text fg={theme().warning}>[{warnings.join(". ")}]</text>
      </Show>
    </ResultFrame>
  );
};
