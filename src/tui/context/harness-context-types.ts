import type { Accessor } from "solid-js"
import type { Theme } from "../themes"
import type { SyntaxStyle } from "@opentui/core"
import type { AgentState } from "@earendil-works/pi-agent-core"
import type { TuiAgentMessage } from "../shared/types/tui-harness"

export type HarnessState = {
  model: string,
  agent?: AgentState,
  tokens: {
    in: number, out: number, cw: number, cr: number, total: number
  },
  cost: {
    in: number, out: number, cw: number, cr: number, total: number
  }
  messages: TuiAgentMessage[] 
}

export type HarnessContextAction = {
  createSession: (sessionId?: string) => Promise<void>
  prompt: (text: string) => Promise<void>
}

export type HarnessContextSelect = {
  messages: Accessor<TuiAgentMessage[]>
}