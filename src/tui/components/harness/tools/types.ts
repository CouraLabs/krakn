import type { ReactNode } from "react";

export type ToolResultProps = {
  name: string;
  args: string; // pretty JSON
  result?: { content: unknown[]; details?: unknown };
  isError?: boolean;
  streaming: boolean; // block.streaming
  status: "running" | "done" | "error";
};

export type ToolRenderer = (props: ToolResultProps) => ReactNode;
