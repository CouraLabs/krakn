import { useContext } from "solid-js";
import { AppContext } from "../context/appContext";

export const useTui = () => {
  const appCtx = useContext(AppContext)

  return {
    ...appCtx.action!,
    ...appCtx.select!
  }
}