import { createContext, createEffect, createMemo, createSignal, type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import { allThemes, generateSubtleSyntax, generateSyntax, resolveTheme, type Theme } from "../themes";
import type { AppContextAction, AppContextSelect, AppState, TuiVariant } from "./app-context-types";

const themes = allThemes()
const defaultTheme = 'default'
const defaultThemeVariant: TuiVariant = 'dark'
const defaultJsonTheme = themes[defaultTheme]
const defaultResolvedTheme = resolveTheme(defaultJsonTheme, defaultThemeVariant)

export const AppContext = createContext<{ action: AppContextAction, select: AppContextSelect }>({
  action: {} as AppContextAction, select: {} as AppContextSelect
})

export const AppContextProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<AppState>({ tui: { theme: 'default', variant: 'dark' } })
  const [theme, setTheme] = createSignal(defaultResolvedTheme)
  const [syntax, setSyntax] = createSignal({
    default: generateSyntax(defaultResolvedTheme),
    muted: generateSubtleSyntax(defaultResolvedTheme)
  })

  const action: AppContextAction = {
    setTui: (data: Partial<AppState['tui']>) => {
      setState('tui', (v) => {
        if(!data) return v
        return { ...v, data }
      })
    },
    setTheme: (theme: string) => {
      setState('tui', 'theme', theme)
    },
    setThemeVariant: (variant: TuiVariant) => {
      setState('tui', 'variant', variant)
    }
  }

  createEffect(() => {
    const variant = state.tui.variant
    const theme = state.tui.theme
    const resolvedTheme = resolveTheme(themes[theme], variant)
    setTheme(resolvedTheme)
    setSyntax({
      default: generateSyntax(resolvedTheme),
      muted: generateSubtleSyntax(resolvedTheme)
    })
  })

  const select: AppContextSelect = {
    tui: createMemo(() => state.tui),
    agent: createMemo(() => state.agent),
    theme: theme,
    syntax: syntax
  }

  return (
    <AppContext.Provider value={{ action, select }}>
      {props.children}
    </AppContext.Provider>
  )
}