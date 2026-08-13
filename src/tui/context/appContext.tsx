import { createContext, createEffect, createMemo, createSignal, type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import { allThemes, resolveTheme, type Theme } from "../themes";
import type { AppContextAction, AppContextSelect, ContextValue, AppState, TuiVariant } from "./context-types";

const themes = allThemes()
const defaultTheme = 'default'
const defaultThemeVariant: TuiVariant = 'dark'
const defaultJsonTheme = themes[defaultTheme]
const defaultResolvedTheme = resolveTheme(defaultJsonTheme, defaultThemeVariant)

export const AppContext = createContext<ContextValue<AppContextAction, AppContextSelect>>({
  action: {} as AppContextAction, select: {} as AppContextSelect
})

export const AppContextProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<AppState>({
    tui: { theme: 'default', variant: 'dark' }
  })
  const [theme, setTheme] = createSignal(defaultResolvedTheme)

  const action: AppContextAction = {
    setTui: (data: Partial<AppState['tui']>) => {
      setState('tui', (v) => {
        if(!data) return v
        return { ...v, data }
      })
    },
    themeChange: (theme: string) => {
      setState('tui', 'theme', theme)
    },
    variantChange: (variant: TuiVariant) => {
      setState('tui', 'variant', variant)
    }
  }

  createEffect(() => {
    const variant = state.tui.variant
    const theme = state.tui.theme
    setTheme(resolveTheme(themes[theme], variant))
  })

  const select: AppContextSelect = {
    tui: createMemo(() => state.tui),
    agent: createMemo(() => state.agent),
    theme: theme
  }

  return (
    <AppContext.Provider value={{ action, select }}>
      {props.children}
    </AppContext.Provider>
  )
}