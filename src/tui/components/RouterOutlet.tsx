import { AgentPage } from "./pages/AgentPage"

export type RouterOutletProps = {
  page: 'agent' | 'filetree' | 'sessions'
}

export const RouterOutlet = (props: RouterOutletProps) => {
  return (
    <box flexDirection="column" flexGrow={1} flexShrink={1} flexBasis={0}>
      {props.page === 'agent' && <AgentPage />}
      {props.page === 'filetree' && <text>FILE TREE</text>}
      {props.page === 'sessions' && <text>SESSIONS</text>}
    </box>
  )
}