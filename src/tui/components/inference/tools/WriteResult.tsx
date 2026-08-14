import { useAppStore } from "../../../../hooks/app-provider";
import { extractText } from "./content";
import type { ToolResultProps } from "./types";

export const WriteResult = (props: ToolResultProps) => {
  const { theme } = useAppStore();
  const text = extractText(props.result?.content ?? []);
  // details: undefined; content is "Successfully wrote N bytes to <path>".
  return <text fg={theme().textMuted}>{text || "(no output)"}</text>;
};
