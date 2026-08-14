import { createContext, type ParentComponent } from "solid-js";
import type { Command } from "./command-types";

export const CommandContext = createContext<Command[]>([])

export const CommandContextProvider: ParentComponent = ({ children }) => {
  return (
    <CommandContext.Provider value={[]}>
      {children}
    </CommandContext.Provider>
  )
}