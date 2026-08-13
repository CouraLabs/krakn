import { createSignal, Show } from "solid-js"
import { useTui } from "../hooks/useTui"

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
  const { theme } = useTui()
  const [hovered, setHovered] = createSignal(false)

  return (
    <box flexDirection="row">
      <Show when={props.addWrappers}>
        <text bg={hovered() ? theme().backgroundElement : undefined} fg={theme().textMuted}>
          {props.label}
        </text>
      </Show>
      <text
        fg={hovered() ? theme().accent : theme().text}
        bg={hovered() ? theme().backgroundElement : undefined}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        onMouseDown={() => props.onClick?.()}
      >
        {props.label}
      </text>
      <Show when={props.addWrappers}>
        <text bg={hovered() ? theme().backgroundElement : undefined} fg={theme().textMuted}>
          {props.label}
        </text>
      </Show>
    </box>
  )
}