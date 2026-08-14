import type { ChatBlock } from "../../../hooks/agent-provider";
import { AssistantView } from "./AssistantView";
import { UserView } from "./UserView";
import { ToolView } from "./ToolView";
import { ThinkingView } from "./ThinkingView";
import { BashView } from "./BashView";

export const BlockView = (props: { block: ChatBlock; }) => {
  switch (props.block.kind) {
    case "user": return <UserView block={props.block} />;
    case "tool": return <ToolView block={props.block} />;
    case "bash": return <BashView block={props.block} />;
    case "thinking": return <ThinkingView block={props.block} />;
    default: return <AssistantView block={props.block} />;
  }
};
