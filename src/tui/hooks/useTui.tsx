import { useContext } from "solid-js";
import { AppContext } from "../context/appContext";

export const useTui = () => {
  const appCtx = useContext(AppContext)

  return {
    // Actions
    setTui: appCtx.action!.setTui,
    setTheme: appCtx.action!.setTheme,
    setThemeVariant: appCtx.action!.setThemeVariant,

    // Selectors
    theme: appCtx.select!.theme,
    tui: appCtx.select!.tui,
    syntax: appCtx.select!.syntax
  }
}