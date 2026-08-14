import { Show } from "solid-js"
import { AgentPage } from "./pages/AgentPage"

export type RouterOutletProps = {
  page: 'agent' | 'filetree' | 'sessions'
}

export const RouterOutlet = (props: RouterOutletProps) => {
  return (
    <box flexDirection="column">
      <Show when={props.page === 'agent'}>
        <AgentPage />
      </Show>
      <Show when={props.page === 'filetree'}>
        <text>FILE TREE</text>
      </Show>
      <Show when={props.page === 'sessions'}>
        <text>SESSIONS</text>
      </Show>
    </box>
  )
}
