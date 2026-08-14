import type { Accessor } from "solid-js"
import type { Theme } from "../themes"
import type { SyntaxStyle } from "@opentui/core"

export type TuiVariant = "light" | "dark"

export type TuiState = {
  theme: string
  variant: TuiVariant
}

export type AppState = {
  tui: TuiState,
  agent?: never
}

export type AppContextAction = {
  setTui: (data: Partial<AppState['tui']>) => void
  setTheme: (theme: string) => void
  setThemeVariant: (variant: TuiVariant) => void
}

export type AppContextSelect = {
  tui: Accessor<AppState['tui']>,
  agent: Accessor<AppState['agent']>,
  theme: Accessor<Theme>,
  syntax: Accessor<{
    default: SyntaxStyle,
    muted: SyntaxStyle,
  }>
}