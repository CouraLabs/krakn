import { createContext, createMemo, onCleanup, onMount, type ParentComponent } from "solid-js";
import type { HarnessContextAction, HarnessContextSelect, HarnessState, ModelInfo } from "./harness-context-types";
import { createStore } from "solid-js/store";
import { createKraknAgent } from "../../harness/agent";
import type { TuiAgentMessage, TuiMessageStatus, TuiToolCallAgentMessage } from "../shared/types/tui-harness";
import { getSupportedThinkingLevels, type Api, type Model, type ModelThinkingLevel } from "@earendil-works/pi-ai";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { ulid } from "ulid";

/** Map an assistant message's final stopReason onto the UI lifecycle status. */
const statusFromStopReason = (reason: string): TuiMessageStatus => {
  switch(reason) {
    case 'error':
    case 'aborted': return 'error'
    case 'pending': return 'processing'
    default: return 'done'
  }
}

/** Project a provider model onto the TUI-facing `ModelInfo` shape. */
const toModelInfo = (model: Model<Api>): ModelInfo => ({
  provider: model.provider,
  modelId: model.id,
  modelName: model.name ?? model.provider,
  contextSize: model.contextWindow,
  thinkingLevels: getSupportedThinkingLevels(model),
  supports: model.input,
  costs: model.cost,
})

export const HarnessContext = createContext<{ action: HarnessContextAction, select: HarnessContextSelect }>({
  action: {} as HarnessContextAction, select: {} as HarnessContextSelect
})

export const HarnessContextProvider: ParentComponent = (props) => {
  const [state, setState] = createStore<HarnessState>({
    messages: [], tokens: { in: 0, out: 0, cr: 0, cw: 0, total: 0 }, cost: { in: 0, out: 0, cr: 0, cw: 0, total: 0 },
    working: false, steering: [], queued: [], currentModel: undefined
  })

  const kraknAgent = createKraknAgent(process.cwd())

  onMount(() => {
    let textId = ''
    let thinkingId = ''

    kraknAgent.on('agent_start', () => setState('working', true))
    kraknAgent.on('agent_end', () => setState('working', false))
    kraknAgent.on('queue_update', (e) => {
      setState('steering', e.steering)
      setState('queued', e.queued)
    })
    
    kraknAgent.on('message_end', (e) => {
      if(e.message.role === "assistant") {
        const status = statusFromStopReason(e.message.stopReason)
        setState('messages', (msgs) => msgs.map((m) =>
          m.role === 'assistant' && m.status === 'processing' ? { ...m, status } : m
        ))
      }
    })

    kraknAgent.on('usage_update', (e) => {
      setState('tokens', e.tokens)
      setState('cost', e.cost)
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

  const action: HarnessContextAction = {
    createSession: async (sessionId?: string) => {
      await kraknAgent.newSession(sessionId)
      const model = kraknAgent.currentModel()
      setState('currentModel', model ? toModelInfo(model) : undefined)
    },
    abort: () => kraknAgent.abort(),
    prompt: async (text: string) => {
      if (!kraknAgent.currentModel()) {
        console.warn('[harness] No model selected; prompt ignored')
        return
      }
      await kraknAgent.prompt(text)
    },
    queue: (text: string) => {
      if (!kraknAgent.currentModel()) {
        console.warn('[harness] No model selected; prompt not queued')
        return
      }
      kraknAgent.queue(text)
    },
    steer: (text: string) => {
      if (!kraknAgent.currentModel()) {
        console.warn('[harness] No model selected; prompt not steered')
        return
      }
      kraknAgent.steer(text)
    },
    clearQueue: () => kraknAgent.clearQueue(),
    clearSteering: () => kraknAgent.clearSteering(),
    switchModel: async (provider: string, modelId: string) => {
      await kraknAgent.switchModel(provider, modelId)
      const model = kraknAgent.currentModel()
      setState('currentModel', model ? toModelInfo(model) : undefined)
    },
    switchThinking: (level: ThinkingLevel) => kraknAgent.switchThinkingLevel(level)
  }

  const select: HarnessContextSelect = {
    messages: createMemo(() => state.messages),
    availableModels: createMemo(() => kraknAgent.availableModels().map(toModelInfo)),
    availableThinkingLevels: createMemo(() => {
      const levels = new Set<ModelThinkingLevel>()
      for (const model of kraknAgent.availableModels()) {
        for (const level of getSupportedThinkingLevels(model)) levels.add(level)
      }
      return [...levels]
    }),
    usage: createMemo(() => ({ tokens: state.tokens, cost: state.cost })),
    currentModel: createMemo(() => state.currentModel),
    working: createMemo(() => state.working),
    queuedPrompts: createMemo(() => state.queued),
    steeringPrompts: createMemo(() => state.steering)
  }

  onCleanup(() => {
    kraknAgent.dispose()
  })

  return (
    <HarnessContext.Provider value={{ action, select }}>{props.children}</HarnessContext.Provider>
  )
}