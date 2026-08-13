import type { Accessor } from "solid-js"
import type { Theme } from "../themes"

export type ContextValue<TActions, TSelectors> = {
  action: TActions | undefined,
  select: TSelectors | undefined
}

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
  themeChange: (theme: string) => void
  variantChange: (variant: TuiVariant) => void
}

export type AppContextSelect = {
  tui: Accessor<AppState['tui']>,
  agent: Accessor<AppState['agent']>,
  theme: Accessor<Theme>,
}