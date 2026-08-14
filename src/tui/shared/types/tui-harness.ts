import type { ToolPair } from "../../../harness/harness-types"

export type TuiMessageStatus = 'error' | 'processing' | 'done'

export type TuiUserAgentMessage = { 
  role: 'user', 
  id: string, 
  content: string,
  status: TuiMessageStatus,
  when: number
}

export type TuiAssistantAgentMessage = { 
  role: 'assistant', 
  id: string, 
  type: 'thinking' | 'assistant' | 'tool', 
  content: string, 
  images?: [],
  status: TuiMessageStatus,
  when: number
}

export type TuiToolCallAgentMessage = {
  role: 'tool',
  id: string,
  name: string,
  status: TuiMessageStatus,
  info: Extract<ToolPair, { name: string }>,
  when: number
}

export type TuiAgentMessage = 
  TuiUserAgentMessage |
  TuiAssistantAgentMessage | 
  TuiToolCallAgentMessage