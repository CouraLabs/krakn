import { createSignal, Show } from "solid-js";
import { useTui } from "../../hooks/useTui";
import type { TuiAssistantAgentMessage } from "../../shared/types/tui-harness";
import { icons } from "../../shared/icons";

const truncate = (text: string, size: number) => text

export const ThinkingView = (props: { message: TuiAssistantAgentMessage; }) => {
  const { theme, syntax } = useTui();
  const [ collapsed, setCollapsed ] = createSignal(true);

  const thinking = () => props.message;
  const truncatedContent = () => truncate(props.message.content, 100)
  const isTruncated = () => truncatedContent() < props.message.content

  return (
    <box flexDirection='row' gap={1}>
      <text fg={theme().textMuted}>{icons.diamond}</text>
      <box flexDirection="column">
        <Show when={isTruncated()}>
          <text fg={theme().textMuted} flexShrink={0} onMouseDown={(e) => {
            e.preventDefault();
            setCollapsed((v) => !v);
          }}>{collapsed() ? truncatedContent() : (props.message.status == "done" ? 'Thought' : 'Thinking...')} {collapsed() ? icons.chevronRight : icons.chevronDown}</text>
        </Show>
        <Show when={!collapsed() || !isTruncated()}>
          <code
            filetype="markdown"
            fg={theme().textMuted}
            streaming={true}
            conceal={true}
            syntaxStyle={syntax().muted}
            content={thinking().content}
            onMouseDown={(e) => {
              e.preventDefault();
              setCollapsed((v) => !v);
            }}
          />
        </Show>
      </box>
    </box>
  );
};
