import { AssistantView } from "./AssistantView";
import { UserView } from "./UserView";
import { ToolView } from "./ToolView";
import { ThinkingView } from "./ThinkingView";
import type { TuiAgentMessage } from "../../shared/types/tui-harness";

export const AgentMessageView = (props: { message: TuiAgentMessage; }) => {
  switch (props.message.role) {
    case "user": return <UserView message={props.message} />;
    case "tool": return <ToolView tool={props.message} />;
    default: return props.message.type === 'assistant' ? 
      <AssistantView message={props.message} /> :
      <ThinkingView message={props.message} />
  }
};
