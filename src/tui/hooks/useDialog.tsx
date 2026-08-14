import { useContext } from "solid-js";
import { DialogContext } from "../context/dialogContext";

export const useDialog = () => {
  const dialogCtx = useContext(DialogContext)

  return {
    // Selectors
    isOpen: dialogCtx.select!.isOpen,
    // Actions
    open: dialogCtx.action!.open,
    close: dialogCtx.action!.close,
  }
}