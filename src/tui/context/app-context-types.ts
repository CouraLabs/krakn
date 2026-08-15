export type TuiVariant = "light" | "dark"

export type TuiState = {
  theme: string
  variant: TuiVariant
}

export type AppState = {
  tui: TuiState
}

export type AppContextAction = {
  setTui: (data: Partial<AppState['tui']>) => void
  setTheme: (theme: string) => void
  setThemeVariant: (variant: TuiVariant) => void
}