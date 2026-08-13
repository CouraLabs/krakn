import { createSignal } from "solid-js"
import { Router } from "./components/router"
import { Dropdown } from "./components/Dropdown"
import { Dialog } from "./components/Dialog"
import type { DialogSize } from "./components/Dialog"
import { useTui } from "./hooks/useTui"
import { allThemes } from "./themes"
import type { TuiVariant } from "./context/context-types"

const VARIANTS: { value: TuiVariant, label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
]

const DIALOG_SIZES: { value: DialogSize, label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "full", label: "Full" },
]

// Testing harness: select a theme (and variant) through the dropdown so the
// theming and the dropdown component can be verified visually. Picking a size
// from the last dropdown opens a centered demo dialog.
export const Main = () => {
  const { theme, themeChange, variantChange, tui } = useTui()
  const [dialog, setDialog] = createSignal<DialogSize>()

  const themeOptions = Object.keys(allThemes()).map((key) => ({ value: key, label: key }))

  return (
    <box flexDirection="column" height="100%" width="100%">
      <box flexDirection="row" paddingX={1} paddingY={1} height={3} backgroundColor={theme().background}>
        <Dropdown<string>
          options={themeOptions}
          value={tui().theme}
          onChange={(v) => themeChange(v)}
          placeholder="Select theme"
        />
        <Dropdown<TuiVariant>
          options={VARIANTS}
          value={tui().variant}
          onChange={(v) => variantChange(v)}
          placeholder="Select variant"
        />
        <Dropdown<DialogSize>
          options={DIALOG_SIZES}
          value={dialog()}
          onChange={(v) => setDialog(v)}
          placeholder="Open dialog"
        />
        <text fg={theme().textMuted} marginLeft={2}>
          theme: {tui().theme} · variant: {tui().variant}
        </text>
      </box>
      <Router />
      <Dialog
        open={!!dialog()}
        size={dialog()}
        onClose={() => setDialog(undefined)}
        title="Demo dialog"
      >
        <box flexDirection="column" paddingX={1}>
          <text fg={theme().text}>The body comes from the Dialog children.</text>
          <text fg={theme().textMuted}>Close with the ✕ button, Escape, or by clicking outside.</text>
        </box>
      </Dialog>
    </box>
  )
}