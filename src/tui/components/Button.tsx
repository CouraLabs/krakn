import { useContext, useState } from "react"
import { AppContext } from "../context/appContext"
import { icons } from "../shared/icons"

export type ButtonProps = {
  label: string
  addWrappers?: boolean
  onClick?: () => void
}

/**
 * A clickable terminal button built on a `<text>` element with mouse events.
 * The foreground/background highlight while hovered; clicking fires `onClick`.
 */
export function Button(props: ButtonProps) {
  const { theme } = useContext(AppContext)
  const [hovered, setHovered] = useState(false)

  return (
    <box flexDirection="row" gap={1}>
      {props.addWrappers && (
        <text bg={hovered ? theme.accent : theme.backgroundElement} fg={theme.textMuted}>❲</text>
      )}
      <text
        fg={hovered ? theme.accent : theme.text}
        bg={hovered ? theme.accent : theme.backgroundElement}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        onMouseDown={() => props.onClick?.()}
      >
        {props.label}
      </text>
      {props.addWrappers && (
        <text bg={hovered ? theme.accent : theme.backgroundElement} fg={theme.textMuted}>❳</text>
      )}
    </box>
  )
}