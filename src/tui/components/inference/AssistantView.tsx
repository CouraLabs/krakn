import type { AssistantMessage } from "@earendil-works/pi-ai";
import { useTui } from "../../hooks/useTui";

export const AssistantView = (props: { message: AssistantMessage; }) => {
  const { theme, syntax } = useTui();

  const assistant = (m: AssistantMessage) => {
    return {
      ok: m.stopReason === "stop",
      processing: m.stopReason === "pending",
      content: m.content
    }  
  };

  return (
    <box
      flexDirection="row"
      gap={1}
    >
      <text fg={theme().primary}>{icons.agent}</text>
      <box flexDirection="column" width="100%">
        <code
          filetype="markdown"
          fg={assistant().status === 'error' ? theme().error : theme().text}
          streaming={true}
          conceal={true}
          syntaxStyle={syntax().default}
          treeSitterClient={treeSitterClient}
          content={assistant().content} 
        />
      </box>
    </box>
  );
};
