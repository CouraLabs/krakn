import { useContext } from "solid-js";
import { AppContext } from "../context/appContext";
import type { ContextValue, AppContextAction, AppContextSelect } from "../context/context-types";

export const useTui = () => {
  const appCtx = useContext<ContextValue<AppContextAction, AppContextSelect>>(AppContext)

  return {
    // Actions
    setTui: appCtx.action!.setTui,
    themeChange: appCtx.action!.themeChange,
    variantChange: appCtx.action!.variantChange,

    // Selectors
    theme: appCtx.select!.theme,
    tui: appCtx.select!.tui,
  }
}