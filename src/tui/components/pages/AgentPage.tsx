import { onMount } from "solid-js"
import { useTui } from "../../hooks/useTui"
import { useHarness } from "../../hooks/useHarness"
import { Prompt } from "../harness/Prompt"
import { HarnessMessages } from "../harness/HarnessMessages"
import { useKeyboard, useRenderer } from "@opentui/solid"

export const AgentPage = () => {
  const renderer = useRenderer()
  const { messages, createSession, switchModel } = useHarness()
  const { theme } = useTui()

  onMount(async () => {
    try {
      await createSession()
    } catch(err) {
      if((err as Error).message.includes('model')) {
        await switchModel('opencode', 'big-pickle')
      }
    }
  })

  useKeyboard((keyEvent) => {
    if(keyEvent.ctrl && keyEvent.name === ' ')
      renderer.console.show()
  })

  return (
    <box id="agent-page" flexDirection="column" paddingX={1} paddingTop={1}>
      <HarnessMessages messages={messages()} />
      <Prompt />
    </box>
  )
}