import { Main } from "./Main"
import { AppContextProvider } from "./context/appContext"

export const App = () => {
  return (
    <AppContextProvider>
      <Main />
    </AppContextProvider>
  )
}