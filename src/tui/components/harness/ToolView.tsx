import { useContext, useState } from "react";
import { renderToolResult, summarizeToolArg } from "./tools";
import type { ToolResultProps } from "./tools/types";
import { icons } from "../../shared/icons";
import type { TuiToolCallAgentMessage } from "../../shared/types/tui-harness";
import { AppContext } from "../../context/appContext";

/**
 * Render one tool call as a collapsed header (name + summarized args + status
 * color) that expands to the tool's structured result and its raw JSON args.
 *
 * The message stores call inputs on `info.in` and the tool's output on
 * `info.out`: the full `AgentToolResult` (`{ content, details }`) on success,
 * or `{ error: text }` when the call failed (see harnessContext).
 */
export const ToolView = (props: { tool: TuiToolCallAgentMessage }) => {
  const { theme, syntax } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [argsOpen, setArgsOpen] = useState(false);

  const running = props.tool.status === "processing";
  const isError = props.tool.status === "error";
  const statusColor = running ? theme.info : isError ? theme.error : theme.success;

  // `write` carries no `out`, and harnessContext stores the output through a
  // cast, so treat the payload as opaque `unknown` acceptable to the renderers.
  const out: unknown = "out" in props.tool.info ? props.tool.info.out : undefined;

  // The tool renderers expect `result: { content[], details? }`. `info.out` is
  // already that shape on success; on failure it carries `{ error: text }`,
  // which we surface through `content` so the error frames display it.
  const result: ToolResultProps["result"] | undefined = (() => {
    if (isError) {
      const errorText =
        out !== null &&
        typeof out === "object" &&
        "error" in out &&
        typeof out.error === "string"
          ? out.error
          : "";
      return { content: [{ type: "text", text: errorText }], details: {} };
    }
    if (out !== null && typeof out === "object" && "content" in out && Array.isArray(out.content)) {
      return out as ToolResultProps["result"];
    }
    return undefined;
  })();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={statusColor}>{icons.bullet}</text>
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
            <text fg={statusColor} flexShrink={0}>{props.tool.name}</text>
            <text fg={theme.textMuted} flexShrink={0}>({summarizeToolArg(props.tool.name, JSON.stringify(props.tool.info.in ?? {}))})</text>
          </box>
          <text fg={statusColor} flexShrink={0}>{open ? icons.chevronRight : icons.chevronDown}</text>
        </box>
        {open && (
          <box flexDirection="column" width="100%">
            {renderToolResult({
              name: props.tool.name,
              args: JSON.stringify(props.tool.info.in ?? {}),
              result: result,
              isError: isError,
              streaming: running,
              status: running ? "running" : isError ? "error" : "done",
            })}
            <box
              flexDirection="row"
              gap={1}
              onMouseDown={(e) => {
                e.preventDefault();
                setArgsOpen((v) => !v);
              }}
            >
              <text fg={theme.textMuted} flexShrink={0}>
                {argsOpen ? icons.chevronDown : icons.chevronRight} args
              </text>
            </box>
            {argsOpen && (
              <code
                syntaxStyle={syntax.muted}
                streaming={true}
                conceal={true}
                filetype="json"
                content={JSON.stringify(props.tool.info.in ?? {}, undefined, 2)} />
            )}
          </box>
        )}
      </box>
    </box>
  );
};