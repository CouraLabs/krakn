import { useContext } from "solid-js";
import { HarnessContext } from "../context/harnessContext";

export const useHarness = () => {
  const harnessCtx = useContext(HarnessContext)

  return {
    // Selectors
    messages: harnessCtx.select!.messages
  }
}