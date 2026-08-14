import { AppContextProvider } from "./context/appContext"
import { DialogContextProvider } from "./context/dialogContext"
import { useTui } from "./hooks/useTui"
import { useTerminalDimensions } from "@opentui/solid"
import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import { CommandContextProvider } from "./context/commandContext"
import { RouterOutlet } from "./components/RouterOutlet"
import { HarnessContextProvider } from "./context/harnessContext"

export const App = () => {
  
  const Boostrap = () => {
    const dims = useTerminalDimensions()
    const { theme } = useTui()
    
    return (
      <box id="box-wrapper" flexDirection="column" height={dims().height} width={dims().width} backgroundColor={theme().background}>
        <Header />
        <RouterOutlet page="agent" />
        <Footer />
      </box>
    )
  }

  return (
    <AppContextProvider>
      <HarnessContextProvider>
        <DialogContextProvider>
          <CommandContextProvider>
            <Boostrap />
          </CommandContextProvider>
        </DialogContextProvider>
      </HarnessContextProvider>
    </AppContextProvider>
  )
}