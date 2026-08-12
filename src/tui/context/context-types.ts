import type { Accessor } from "solid-js"

export type ContextValue<TActions, TSelectors> = {
  action: TActions | undefined,
  select: TSelectors | undefined
}

export type TuiState = {
  theme: string
}

export type AppState = {
  settings?: never
  tui: TuiState,
  agent?: never
}

export type AppContextAction = {
  setTui: (data: Partial<AppState['tui']>) => void
}

export type AppContextSelect = {
  settings: Accessor<AppState['settings']>,
  tui: Accessor<AppState['tui']>,
  agent: Accessor<AppState['agent']>,
}