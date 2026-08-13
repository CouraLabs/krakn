import { useTui } from "../hooks/useTui"

export const Router = () => {
  const { theme } = useTui()
  return (
    <box height="100%" width="100%" flexDirection="column" backgroundColor={theme().background}>
      <box flexDirection="row">
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1} borderColor={theme().borderActive} focusedBorderColor={theme().borderActive} focused={true}>
          <text fg={theme().text}>Tab 1</text>
        </box>
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1}>
          <text fg={theme().text}>Tab 2</text>
        </box>
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1}>
          <text fg={theme().text}>Tab 3</text>
        </box>
        <box borderStyle="rounded" border={['left', 'top', 'right']} paddingX={1}>
          <text fg={theme().text}>Tab 4</text>
        </box>
      </box>
      <box border borderColor={theme().accent} flexDirection="row" height="100%">
        <text fg={theme().text}>Wuuut</text>
        <text fg={theme().textMuted}>hart!</text>
      </box>
    </box>
  )
}