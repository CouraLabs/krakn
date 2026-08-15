import { useContext } from "react";
import { AppContext } from "../../context/appContext";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { TuiAssistantAgentMessage } from "../../shared/types/tui-harness";
import { icons } from "../../shared/icons";

export const AssistantView = (props: { message: TuiAssistantAgentMessage; }) => {
  const { theme, syntax } = useContext(AppContext);

  return (
    <box
      flexDirection="row"
      gap={1}
    >
      <text fg={theme.primary}>{icons.check}</text>
      <box flexDirection="column" width="100%">
        <code
          filetype="markdown"
          fg={props.message.status === 'error' ? theme.error : theme.text}
          streaming={true}
          conceal={true}
          syntaxStyle={syntax.default}
          content={props.message.content} 
        />
      </box>
    </box>
  );
};
