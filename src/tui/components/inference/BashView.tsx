import { createSignal, Show } from "solid-js";
import type { ChatBlock } from "../../../hooks/agent-provider";
import { useAppStore } from "../../../hooks/app-provider";
import { icons } from "../../icons";
import { renderToolResult, summarizeToolArg } from "./tools";

/**
 * Renders a locally-executed bash command (Bash prompt role).
 *
 * Mirrors the agent bash tool rendering (header + result body) but the
 * command never enters the LLM context; a notice makes that explicit.
 */
export const BashView = (props: { block: ChatBlock; }) => {
  const { theme } = useAppStore();
  const [open, setOpen] = createSignal(true);

  const tool = () => (props.block.tool!);
  const running = () => props.block.status === "running";
  const error = () => props.block.status === "error";
  const statusColor = () => running()
    ? theme().info : error()
    ? theme().error : theme().success;

  return (
    <box paddingX={1} border={["left"]} borderStyle="heavy" borderColor={statusColor()}>
      <box flexDirection="column" width="100%">
        <box
          flexDirection="row"
          gap={1}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
        >
          <box flexDirection="row" flexShrink={0}>
            <text fg={statusColor()} flexShrink={0}>{tool().name}</text>
            <text fg={theme().textMuted} flexShrink={0}>({summarizeToolArg(tool().name, tool().args)})</text>
          </box>
          <text fg={statusColor()} flexShrink={0}>{open() ? icons.arrowdown : icons.arrowright}</text>
        </box>
        <Show when={open()}>
          <box flexDirection="column" width="100%">
            {renderToolResult({
              name: tool().name,
              args: tool().args,
              result: tool().result,
              isError: tool().isError,
              streaming: props.block.streaming,
              status: props.block.status,
            })}
            <text fg={theme().textMuted}>[local: not sent to the LLM context]</text>
          </box>
        </Show>
      </box>
    </box>
  );
};
