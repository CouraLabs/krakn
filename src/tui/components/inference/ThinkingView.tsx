import { createSignal, Show } from "solid-js";
import type { ChatBlock } from "../../../hooks/agent-provider";
import { useAppStore } from "../../../hooks/app-provider";
import { icons } from "../../icons";
import { truncate } from "../../../libs/strings";

export const ThinkingView = (props: { block: ChatBlock; }) => {
  const { theme, subtleSyntax } = useAppStore();
  const [ collapsed, setCollapsed ] = createSignal(true);

  const thinking = () => props.block;
  const truncatedContent = () => truncate(props.block.content, 100)

  return (
    <box flexDirection='row' gap={1}>
      <text fg={theme().textMuted}>{icons.brain}</text>
      <box flexDirection="column">
        <Show when={truncatedContent().isTruncated}>
          <text fg={theme().textMuted} flexShrink={0} onMouseDown={(e) => {
            e.preventDefault();
            setCollapsed((v) => !v);
          }}>{collapsed() ? truncatedContent().text : (props.block.status == "done" ? 'Thought' : 'Thinking...')} {collapsed() ? icons.arrowright : icons.arrowdown}</text>
        </Show>
        <Show when={!collapsed() || !truncatedContent().isTruncated}>
          <code
            filetype="markdown"
            fg={theme().textMuted}
            streaming={thinking().streaming}
            conceal={!thinking().streaming}
            syntaxStyle={subtleSyntax()}
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
