import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { allThemes, generateSubtleSyntax, generateSyntax, resolveTheme, type Theme } from "../themes";
import type { AppContextAction, AppState, TuiVariant } from "./app-context-types";
import type { SyntaxStyle } from "@opentui/core";

const themes = allThemes()
const defaultTheme = 'default'
const defaultThemeVariant: TuiVariant = 'dark'
const defaultJsonTheme = themes[defaultTheme]
const defaultResolvedTheme = resolveTheme(defaultJsonTheme, defaultThemeVariant)

export type AppContextValue = {
  action: AppContextAction,
  tui: AppState['tui'],
  theme: Theme,
  syntax: {
    default: SyntaxStyle,
    muted: SyntaxStyle,
  }
}

export const AppContext = createContext<AppContextValue>(undefined as unknown as AppContextValue)

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>({ tui: { theme: 'default', variant: 'dark' } })
  const [theme, setTheme] = useState(defaultResolvedTheme)
  const [syntax, setSyntax] = useState({
    default: generateSyntax(defaultResolvedTheme),
    muted: generateSubtleSyntax(defaultResolvedTheme)
  })

  const action: AppContextAction = {
    setTui: (data: Partial<AppState['tui']>) => {
      setState((v) => {
        if(!data) return v
        return { ...v, tui: { ...v.tui, ...data } }
      })
    },
    setTheme: (theme: string) => {
      setState((v) => ({ ...v, tui: { ...v.tui, theme } }))
    },
    setThemeVariant: (variant: TuiVariant) => {
      setState((v) => ({ ...v, tui: { ...v.tui, variant } }))
    }
  }

  useEffect(() => {
    const variant = state.tui.variant
    const theme = state.tui.theme
    const resolvedTheme = resolveTheme(themes[theme], variant)
    setTheme(resolvedTheme)
    setSyntax({
      default: generateSyntax(resolvedTheme),
      muted: generateSubtleSyntax(resolvedTheme)
    })
  }, [state.tui.variant, state.tui.theme])

  const tui = useMemo(() => state.tui, [state.tui])

  return (
    <AppContext.Provider value={{ action, tui, theme, syntax }}>
      {children}
    </AppContext.Provider>
  )
}