import { createContext, useState, type ReactNode } from "react";
import { Dialog } from "../components/Dialog";
import type { DialogContextAction, DialogOpenOptions } from "./dialog-context-types";

export type DialogContextValue = {
  action: DialogContextAction,
  isOpen: boolean
}

export const DialogContext = createContext<DialogContextValue>(undefined as unknown as DialogContextValue)

export const DialogContextProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<DialogOpenOptions>({ content: undefined })

  const action: DialogContextAction = {
    open: (opts: DialogOpenOptions) => {
      setOptions(opts)
      setIsOpen(true)
    },
    close: () => {
      if (!isOpen) return
      setIsOpen(false)
      options.onClose?.()
    }
  }

  return (
    <DialogContext.Provider value={{ action, isOpen }}>
      {/* The Dialog stays mounted here: `open` pushes content into it, and
          every dismissal path (X, cancel, Escape, overlay) routes through
          `action.close`, which fires the stored `onClose`. */}
      <Dialog
        open={isOpen}
        onClose={() => action.close()}
        title={options.title}
        size={options.size}
      >
        {options.content}
      </Dialog>
      {children}
    </DialogContext.Provider>
  )
}