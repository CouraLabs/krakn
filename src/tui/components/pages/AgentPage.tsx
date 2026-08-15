import { useContext, useEffect } from "react"
import { HarnessContext } from "../../context/harnessContext"
import { Prompt } from "../harness/Prompt"
import { HarnessMessages } from "../harness/HarnessMessages"
import { useKeyboard, useRenderer } from "@opentui/react"

export const AgentPage = () => {
  const renderer = useRenderer()
  const harness = useContext(HarnessContext)
  const { createSession, switchModel } = harness.action

  useEffect(() => {
    void (async () => {
      try {
        await createSession()
      } catch(err) {
        if((err as Error).message.includes('model')) {
          await switchModel('opencode', 'deepseek-v4-flash')
        }
      }
    })()
  }, [])

  useKeyboard((keyEvent) => {
    if(keyEvent.ctrl && keyEvent.name === 't')
      renderer.console.toggle()
  })

  return (
    <box id="agent-page" flexDirection="column" flexGrow={1} flexShrink={1} flexBasis={0} paddingX={1} paddingTop={1}>
      <HarnessMessages messages={harness.messages} />
      <Prompt />
    </box>
  )
}