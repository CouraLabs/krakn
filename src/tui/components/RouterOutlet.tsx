import { Show } from "solid-js"
import { useTui } from "../hooks/useTui"

// All spinners shipped by opentui-spinner (cli-spinners), for visual testing.

export type RouterOutletProps = {
  page: 'agent' | 'filetree' | 'sessions'
}

export const RouterOutlet = (props: RouterOutletProps) => {
  const { theme } = useTui()
  return (
    <box flexGrow={1} flexDirection="column" backgroundColor={theme().background}>
      <Show when={props.page === 'agent'}>
        <box></box>
      </Show>
      <Show when={props.page === 'filetree'}>
        <box></box>
      </Show>
      <Show when={props.page === 'sessions'}>
        <box></box>
      </Show>
    </box>
  )
}
