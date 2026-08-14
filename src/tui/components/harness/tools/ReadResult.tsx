import { Show } from "solid-js";
import { extractText, isImagePart } from "./content";
import { argFiletype } from "./filetype";
import { bashWarnings } from "./warnings"; // same shape: { truncation? }
import { CodeBlock } from "./CodeBlock";
import { ResultFrame } from "./ResultFrame";
import type { ToolResultProps } from "./types";
import { useTui } from "../../../hooks/useTui";

export const ReadResult = (props: ToolResultProps) => {
  const { theme } = useTui();
  const content = props.result?.content ?? [];
  const text = extractText(content);
  const images = content.filter(isImagePart);
  const warnings = bashWarnings(props.result?.details);
  return (
    <ResultFrame borderColor={theme().borderSubtle}>
      <CodeBlock status={props.status} filetype={argFiletype(props.args)} content={text || "(empty file)"} />
      <Show when={images.length > 0}>
        <text fg={theme().textMuted}>
          {images.map((img) => `[image: ${img.mimeType}]`).join(" ")}
        </text>
      </Show>
      <Show when={warnings.length > 0}>
        <text fg={theme().warning}>[{warnings.join(". ")}]</text>
      </Show>
    </ResultFrame>
  );
};
