import type { TuiAgentMessage } from "../../shared/types/tui-harness";
import { AgentMessageView } from "./AgentMessageView";

export const HarnessMessages = ({ messages }: { messages: TuiAgentMessage[] }) => {
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
        {messages.map((msg, index) => (
          <box key={msg.id} marginBottom={isSame(index) ? 0 : 1}>
            <AgentMessageView message={msg} />
          </box>
        ))}
      </box>
    </scrollbox>
  )
}