import { TextAttributes } from "@opentui/core"
import { AppContextProvider } from "./context/appContext"
import { useTui } from "./hooks/useTui"
import { app, THEME_VARIANTS, THEMES } from "../globals"
import { useTerminalDimensions } from "@opentui/solid"
import { Dropdown } from "./components/Dropdown"
import type { TuiVariant } from "./context/app-context-types"
import { Index, Show, type Component } from "solid-js"

export const Center = () => {
  const { theme } = useTui();

  return (
    <box
      id="center"
      border={["left", "bottom", "right"]}
      borderColor={theme().border}
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      paddingX={1}
      paddingTop={1}
    >
      <box
        id="center-scroll"
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        flexBasis={0}
        width="100%"
      >
        <scrollbox
          id="center-scroll"
          flexGrow={1}
          flexShrink={1}
          width="100%"
          scrollbarOptions={{
            visible: false,
          }}
          stickyScroll
          stickyStart="bottom"
        >
          <box flexDirection="column" width="100%">
            <Index each={agentState().blocks}>
              {(block, index) => {
                const isSameType = (): boolean => {
                  if(index === agentState().blocks.length - 1) return false
                  return agentState().blocks[index]?.kind === agentState().blocks[index + 1]?.kind
                }
                return (
                  <box marginBottom={isSameType() ? 0 : 1}>
                    <BlockView block={block()} />
                  </box>
                )
              }}
            </Index>
            <Show when={agentState().bootError}>
              <text width="100%" fg={theme().error}>
                {agentState().bootError}
              </text>
            </Show>
          </box>
        </scrollbox>
      </box>
    </box>
  );
};

export const Footer: Component<{}> = (props) => {
  const { theme } = useTui();

  return (
    <box
      id="header"
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

const Header: Component<{}> = () => {
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

const AppWrapper = () => {
  const dims = useTerminalDimensions()
  const { theme } = useTui()
  
  return (
    <box id="box-wrapper" flexDirection="column" height={dims().height} width={dims().width} backgroundColor={theme().background}>
      <Header />
      <Footer />
    </box>
  )
}

export const App = () => <AppContextProvider><AppWrapper /></AppContextProvider>