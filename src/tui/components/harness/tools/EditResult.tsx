import { useContext } from "react";
import { extractText } from "./content";
import { argFiletype } from "./filetype";
import { CodeBlock } from "./CodeBlock";
import type { ToolResultProps } from "./types";
import { ResultFrame } from "./ResultFrame";
import { AppContext } from "../../../context/appContext";

export const EditResult = (props: ToolResultProps) => {
  const { theme, syntax } = useContext(AppContext);
  const text = extractText(props.result?.content ?? []);
  // details: { diff, patch, firstChangedLine? } (edit.d.ts:18-25). The Diff
  // renderable parses unified patches (`@@` headers), so feed it
  // details.patch, not details.diff (a display-oriented string).
  const patch = (props.result?.details as { patch?: string } | undefined)?.patch;
  const filetype = argFiletype(props.args);
  if (patch) {
    return (
      <ResultFrame borderColor={theme.borderSubtle}>
        <diff
          diff={patch}
          syntaxStyle={syntax.muted}
          filetype={filetype}
          conceal={props.status !== "running"}
        />
      </ResultFrame>
    );
  }
  return (
    <box border borderStyle="single" borderColor={theme.border}>
      <CodeBlock status={props.status} filetype={filetype ?? "text"} content={text || "(no output)"} />
    </box>
  );
};
