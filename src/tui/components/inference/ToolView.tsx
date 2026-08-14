import { createSignal, Show } from "solid-js";
import { renderToolResult, summarizeToolArg } from "./tools";
import { icons } from "../../shared/icons";
import type { TuiToolCallAgentMessage } from "../../shared/types/tui-harness";
import { useTui } from "../../hooks/useTui";

export const ToolView = (props: { tool: TuiToolCallAgentMessage; }) => {
  const { theme, syntax } = useTui();
  const [open, setOpen] = createSignal(false);
  const [argsOpen, setArgsOpen] = createSignal(false);

  const statusColor = () => running()
    ? theme().info : error()
    ? theme().error : theme().success;

  return (
    <box flexDirection="row" gap={1}>
      <text fg={statusColor()}>{icons.bullet}</text>
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
            <text fg={statusColor()} flexShrink={0}>{props.tool.name}</text>
            <text fg={theme().textMuted} flexShrink={0}>({summarizeToolArg(props.tool.name, props.tool.args)})</text>
          </box>
          <text fg={statusColor()} flexShrink={0}>{open() ? icons.chevronRight : icons.chevronDown}</text>
        </box>
        <Show when={open()}>
          <box flexDirection="column" width="100%">
            {renderToolResult({
              name: props.tool.name,
              args: props.tool.args,
              result: props.tool.result,
              isError: props.tool.isError,
              streaming: props.block.streaming,
              status: props.block.status,
            })}
            <box
              flexDirection="row"
              gap={1}
              onMouseDown={(e) => {
                e.preventDefault();
                setArgsOpen((v) => !v);
              }}
            >
              <text fg={theme().textMuted} flexShrink={0}>
                {argsOpen() ? icons.arrowdown : icons.arrowright} args
              </text>
            </box>
            <Show when={argsOpen()}>
              <code
                syntaxStyle={subtleSyntax()}
                treeSitterClient={treeSitterClient}
                streaming={running()}
                conceal={!running()}
                filetype="json"
                content={props.tool.args} />
            </Show>
          </box>
        </Show>
      </box>
    </box>
  );
};
