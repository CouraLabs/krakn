import { Index, type Component } from "solid-js";
import type { TuiAgentMessage } from "../../shared/types/tui-harness";
import { AgentMessageView } from "./AgentMessageView";

export const HarnessMessages: Component<{ messages: TuiAgentMessage[] }> = ({ messages }) => {
  const isSame = (index: number) => {
    if(messages.length === 0) return false
    if(index === 0) return false
    const previous = messages.at(index - 1) 
    const current = messages.at(index) 
    return previous?.role === current?.role
  }

  return (
    <scrollbox id="center-scroll" flexGrow={1} flexShrink={1} width="100%" scrollbarOptions={{ visible: false }} stickyScroll stickyStart="bottom">
      <box flexDirection="column" width="100%">
        <Index each={messages}>
          {(msg, index) => {
            return (
              <box marginBottom={isSame(index) ? 0 : 1}>
                <AgentMessageView message={msg()} />
              </box>
            )
          }}
        </Index>
      </box>
    </scrollbox>
  )
}