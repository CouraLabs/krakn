import { useAppStore } from "../../../../hooks/app-provider";
import { extractText } from "./content";
import { CodeBlock } from "./CodeBlock";
import { ResultFrame } from "./ResultFrame";
import type { ToolResultProps } from "./types";

/** Fallback for tools without a dedicated renderer: markdown-formatted text. */
export const MarkdownResult = (props: ToolResultProps) => {
  const { theme } = useAppStore();
  const text = extractText(props.result?.content ?? []);
  return (
    <ResultFrame borderColor={theme().borderSubtle}>
      <CodeBlock
        status={props.status}
        filetype="markdown"
        fg={theme().textMuted}
        content={text || "(no output)"}
      />
    </ResultFrame>
  );
};
