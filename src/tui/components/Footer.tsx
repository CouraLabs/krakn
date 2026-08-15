import { useContext } from "react";
import { AppContext } from "../context/appContext";
import { TextAttributes } from "@opentui/core";

export const Footer = () => {
  const { theme } = useContext(AppContext);

  return (
    <box id="footer" flexDirection="row" gap={1} paddingX={1} paddingY={1}>
      <text fg={theme.text}>ctrl + c</text>
      <text fg={theme.textMuted}>(exit)</text>
      <text fg={theme.textMuted} attributes={TextAttributes.DIM}>|</text>
      <text fg={theme.text}>commands:</text>
      <text fg={theme.info}>/</text>
      <text fg={theme.textMuted} attributes={TextAttributes.DIM}>|</text>
      <text fg={theme.text}>bash:</text>
      <text fg={theme.warning}>!</text>
      <text fg={theme.textMuted} attributes={TextAttributes.DIM}>|</text>
      <text fg={theme.text}>themes:</text>
      <text fg={theme.info}>ctrl+t</text>
    </box>
  );
};