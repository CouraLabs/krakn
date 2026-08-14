import type { Component } from "solid-js"
import { useTui } from "../hooks/useTui"
import { TextAttributes } from "@opentui/core"
import { app, THEME_VARIANTS, THEMES } from "../../globals"
import { Dropdown } from "./Dropdown"
import type { TuiVariant } from "../context/app-context-types"

export const Header: Component<{}> = () => {
  const { theme, tui, setTheme: themeChange, setThemeVariant: variantChange } = useTui()

  return (
    <box id="box-header" flexDirection="row" alignItems="baseline" paddingX={2} paddingY={1}>
      <box flexDirection="row" flexGrow={1} flexShrink={1} flexBasis={0} gap={1}>
        <text fg={theme().text}>Path:</text>
        <text fg={theme().textMuted} attributes={TextAttributes.ITALIC}>{app.cwdView}</text>
      </box>
      <box
        flexDirection="row"
        flexGrow={1}
        flexShrink={1}
        flexBasis={0}
        gap={1}
        justifyContent="flex-end"
      >
        <Dropdown<string>
          options={THEMES}
          value={tui().theme}
          key={'Theme'}
          onChange={(v) => themeChange(v)}
          placeholder="Select theme"
        />
        <Dropdown<TuiVariant>
          options={THEME_VARIANTS}
          key={'Variant'}
          value={tui().variant}
          onChange={(v) => variantChange(v)}
          placeholder="Select variant"
        />
      </box>
    </box>
  )
}