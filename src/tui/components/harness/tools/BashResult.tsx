import { useContext } from "react";
import { extractText } from "./content";
import { bashWarnings } from "./warnings";
import { CodeBlock } from "./CodeBlock";
import { ResultFrame } from "./ResultFrame";
import type { ToolResultProps } from "./types";
import { AppContext } from "../../../context/appContext";

export const BashResult = (props: ToolResultProps) => {
  const { theme } = useContext(AppContext);
  const text = extractText(props.result?.content ?? []);
  const warnings = bashWarnings(props.result?.details);
  return (
    <ResultFrame borderColor={theme.borderSubtle}>
      <CodeBlock status={props.status} filetype="text" content={text || "(no output)"} />
      {warnings.length > 0 && (
        <text fg={theme.warning}>[{warnings.join(". ")}]</text>
      )}
    </ResultFrame>
  );
};
