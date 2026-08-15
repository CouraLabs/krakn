import { TextAttributes } from "@opentui/core";
import { useContext } from "react";
import { AppContext } from "../../context/appContext";
import { icons } from "../../shared/icons";
import type { TuiUserAgentMessage } from "../../shared/types/tui-harness";

export const UserView = (props: { message: TuiUserAgentMessage }) => {
  const { theme } = useContext(AppContext);

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.text} attributes={TextAttributes.DIM}>{icons.chevronBoldRight}</text>
      <text fg={theme.text} content={props.message.content} />
    </box>
  );
};
