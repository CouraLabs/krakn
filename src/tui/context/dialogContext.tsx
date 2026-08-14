import { createContext, createSignal, type ParentComponent } from "solid-js";
import { Dialog } from "../components/Dialog";
import type { DialogContextAction, DialogContextSelect, DialogOpenOptions } from "./dialog-context-types";

export const DialogContext = createContext<{ action: DialogContextAction, select: DialogContextSelect }>({
  action: {} as DialogContextAction, select: {} as DialogContextSelect
})

export const DialogContextProvider: ParentComponent = (props) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [options, setOptions] = createSignal<DialogOpenOptions>({ content: undefined })

  const action: DialogContextAction = {
    open: (opts: DialogOpenOptions) => {
      setOptions(opts)
      setIsOpen(true)
    },
    close: () => {
      if (!isOpen()) return
      setIsOpen(false)
      options().onClose?.()
    }
  }

  const select: DialogContextSelect = {
    isOpen
  }

  return (
    <DialogContext.Provider value={{ action, select }}>
      {/* The Dialog stays mounted here: `open` pushes content into it, and
          every dismissal path (X, cancel, Escape, overlay) routes through
          `action.close`, which fires the stored `onClose`. */}
      <Dialog
        open={isOpen()}
        onClose={() => action.close()}
        title={options().title}
        size={options().size}
      >
        {options().content}
      </Dialog>
      {props.children}
    </DialogContext.Provider>
  )
}