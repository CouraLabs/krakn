import type { Component } from "solid-js";
import { useTui } from "../hooks/useTui";
import { TextAttributes } from "@opentui/core";

export const Footer: Component<{}> = (props) => {
  const { theme } = useTui();

  return (
    <box
      id="footer"
      flexDirection="row"
      gap={1}
      paddingX={1}
      paddingBottom={1}
    >
      <text fg={theme().text}>ctrl + c</text>
      <text fg={theme().textMuted}>(exit)</text>
      <text fg={theme().textMuted} attributes={TextAttributes.DIM}>|</text>
      <text fg={theme().text}>commands:</text>
      <text fg={theme().info}>/</text>
      <text fg={theme().textMuted} attributes={TextAttributes.DIM}>|</text>
      <text fg={theme().text}>bash:</text>
      <text fg={theme().warning}>!</text>
      <text fg={theme().textMuted} attributes={TextAttributes.DIM}>|</text>
      <text fg={theme().text}>themes:</text>
      <text fg={theme().info}>ctrl+t</text>
    </box>
  );
};