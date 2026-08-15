import { createContext, type ReactNode } from "react";
import type { Command } from "./command-types";

export const CommandContext = createContext<Command[]>([])

export const CommandContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CommandContext.Provider value={[]}>
      {children}
    </CommandContext.Provider>
  )
}