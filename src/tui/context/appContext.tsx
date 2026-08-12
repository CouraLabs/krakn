import { createContext, createMemo, type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import type { AppContextAction, AppContextSelect, ContextValue, AppState } from "./context-types";

export const AppContext = createContext<ContextValue<AppContextAction, AppContextSelect>>({
  action: {} as AppContextAction, select: {} as AppContextSelect
})

export const AppContextProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<AppState>({
    tui: { theme: 'default' }
  })

  const action: AppContextAction = {
    setTui: (data: Partial<AppState['tui']>) => {
      setState('tui', (v) => {
        if(!data) return v
        return { ...v, data }
      })
    } 
  }

  const select: AppContextSelect = {
    settings: createMemo(() => state.settings),
    tui: createMemo(() => state.tui),
    agent: createMemo(() => state.agent)
  }

  return (
    <AppContext.Provider value={{ action, select }}>{props.children}</AppContext.Provider>
  )
}