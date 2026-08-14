import { batch, createContext, createMemo, onCleanup, onMount, type ParentComponent } from "solid-js";
import type { HarnessContextAction, HarnessContextSelect, HarnessState } from "./harness-context-types";
import { createStore } from "solid-js/store";
import { createKraknAgent } from "../../harness/agent";
import type { TuiAgentMessage, TuiMessageStatus, TuiToolCallAgentMessage } from "../shared/types/tui-harness";
import { ulid } from "ulid";
import type { Usage } from "@earendil-works/pi-ai";

/** Map an assistant message's final stopReason onto the UI lifecycle status. */
const statusFromStopReason = (reason: string): TuiMessageStatus => {
  switch(reason) {
    case 'error':
    case 'aborted': return 'error'
    case 'pending': return 'processing'
    default: return 'done'
  }
}

export const HarnessContext = createContext<{ action: HarnessContextAction, select: HarnessContextSelect }>({
  action: {} as HarnessContextAction, select: {} as HarnessContextSelect
})

export const HarnessContextProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<HarnessState>({
    model: 'opencode/big-pickle', messages: [], tokens: { in: 0, out: 0, cr: 0, cw: 0, total: 0 }, cost: { in: 0, out: 0, cr: 0, cw: 0, total: 0 }
  })

  const kraknAgent = createKraknAgent(process.cwd())

  onMount(() => {
    let textId = ''
    let thinkingId = ''
    
    kraknAgent.on('message_end', (e) => {
      if(e.message.role === "assistant") {
        updateUsage(e.message.usage)
        const status = statusFromStopReason(e.message.stopReason)
        setState('messages', (msgs) => msgs.map((m) =>
          m.role === 'assistant' && m.status === 'processing' ? { ...m, status } : m
        ))
      }
    })

    kraknAgent.on('message_update', (e) => {
      const assist = e.assistantMessageEvent

      switch(assist.type) {
        case 'text_start': 
          textId = ulid();
          pushMessage({ id: textId, role: 'assistant', type: 'assistant', content: '', images: [], status: 'processing', when: e.message.timestamp })
          break;
        case 'thinking_start': 
          thinkingId = ulid();
          pushMessage({ id: thinkingId, role: 'assistant', type: 'thinking', content: '', images: [], status: 'processing', when: e.message.timestamp })
          break;
        case 'text_delta': 
          pushMessage({ id: thinkingId, role: 'assistant', type: 'assistant', content: assist.delta, images: [], status: 'processing', when: e.message.timestamp })
          break;
        case 'thinking_delta': 
          pushMessage({ id: thinkingId, role: 'assistant', type: 'thinking', content: assist.delta, images: [], status: 'processing', when: e.message.timestamp })
          break;
        case 'thinking_end': break;
        case 'text_end': break;
        case 'toolcall_start':
          const tc = assist.partial.content.find(a => a.type === 'toolCall')
          if(tc) {
            pushMessage({ role: 'tool', id: tc.id, name: tc.name, info: { name: tc.name } as TuiToolCallAgentMessage['info'], status: 'processing', when: e.message.timestamp })
          }
          break;
        case 'toolcall_delta':
          const tcd = assist.partial.content.find(a => a.type === 'toolCall')
          if(tcd) {
            pushMessage({ role: 'tool', id: tcd.id, name: tcd.name, info: { name: tcd.name, in: tcd.arguments } as TuiToolCallAgentMessage['info'], status: 'processing', when: e.message.timestamp })
          }
          break;
      }
    })

    kraknAgent.on('tool_execution_start', (e) => {
      pushMessage({ role: 'tool', id: e.toolCallId, name: e.toolName, info: { name: e.toolName, in: e.args } as TuiToolCallAgentMessage['info'], status: 'processing', when: Date.now() })
    })

    kraknAgent.on('tool_execution_end', (e) => {
      // On success keep the full AgentToolResult (`{ content, details }`) so
      // ToolView can render text/diffs. On error the agent loop returns
      // `{ content:[text], details:{}, isError:true }`, so carry the message
      // in `out` and flag status instead of the empty details.
      const errorText = (e.result?.content as Array<{ type: string; text?: string }> | undefined)
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('\n') ?? ''
      pushMessage({
        role: 'tool', id: e.toolCallId, name: e.toolName,
        status: e.isError ? 'error' : 'done',
        info: { name: e.toolName, out: e.isError ? { error: errorText } : e.result } as TuiToolCallAgentMessage['info'],
        when: Date.now()
      })
    })
  })

  const pushMessage = (upsertMsg: TuiAgentMessage) => {
    setState("messages", (msgs) => {
      let exstMsg = msgs.findIndex(a => a.id === upsertMsg.id) 
      if(exstMsg > -1) {
        const existing = msgs[exstMsg]
        if('content' in existing && 'content' in upsertMsg) {
          msgs[exstMsg] = {
            ...existing,
            content: existing.content + upsertMsg.content
          }
        } else if(existing.role === 'tool' && upsertMsg.role === 'tool') {
          msgs[exstMsg] = {
            ...existing,
            ...upsertMsg,
            info: { ...existing.info, ...upsertMsg.info } as TuiToolCallAgentMessage['info']
          }
        } else {
          msgs[exstMsg] = {
            ...existing,
            ...upsertMsg
          }
        }
        return msgs
      }
      return [...msgs, upsertMsg]
    })
  }

  const updateUsage = (usage: Usage) => {
    batch(() => {
      setState('tokens', (curr) => {
        return {
          in: curr.in + usage.input,
          out: curr.out + usage.output,
          cr: curr.cr + usage.cacheRead,
          cw: curr.cw + usage.cacheWrite,
          total: curr.total + usage.totalTokens
        }
      })

      setState('cost', (curr) => {
        return {
          in: curr.in + usage.cost.input,
          out: curr.out + usage.cost.output,
          cr: curr.cr + usage.cost.cacheRead,
          cw: curr.cw + usage.cost.cacheWrite,
          total: curr.total + usage.cost.total
        }
      })
    })
  }

  const action: HarnessContextAction = {
    createSession: (sessionId?: string) => kraknAgent.newSession(sessionId, state.model),
    prompt: (text: string) => kraknAgent.prompt(text)
  }

  const select: HarnessContextSelect = {
    messages: createMemo(() => state.messages)
  }

  onCleanup(() => {
    kraknAgent.dispose()
  })

  return (
    <HarnessContext.Provider value={{ action, select }}>{props.children}</HarnessContext.Provider>
  )
}