import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { HarnessContextAction, HarnessState, ModelInfo } from "./harness-context-types";
import { createKraknAgent, KraknAgent } from "../../harness/agent";
import type { TuiAgentMessage, TuiMessageStatus, TuiToolCallAgentMessage } from "../shared/types/tui-harness";
import { getSupportedThinkingLevels, type Api, type Model, type ModelThinkingLevel } from "@earendil-works/pi-ai";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { QueuedPrompt, UsageTotals } from "../../harness/harness-types";
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

export type HarnessContextValue = {
  action: HarnessContextAction,
  messages: TuiAgentMessage[],
  availableModels: ModelInfo[],
  availableThinkingLevels: ModelThinkingLevel[],
  usage: { tokens: UsageTotals; cost: UsageTotals },
  currentModel: ModelInfo | undefined,
  working: boolean,
  queuedPrompts: QueuedPrompt[],
  steeringPrompts: QueuedPrompt[],
}

export const HarnessContext = createContext<HarnessContextValue>(undefined as unknown as HarnessContextValue)

export const HarnessContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<HarnessState>({
    messages: [], tokens: { in: 0, out: 0, cr: 0, cw: 0, total: 0 }, cost: { in: 0, out: 0, cr: 0, cw: 0, total: 0 },
    working: false, steering: [], queued: [], currentModel: undefined
  })

  const kraknAgentRef = useRef<KraknAgent | null>(null)
  if (kraknAgentRef.current === null) {
    kraknAgentRef.current = createKraknAgent(process.cwd())
  }
  const kraknAgent = kraknAgentRef.current

  useEffect(() => {
    let textId = ''
    let thinkingId = ''

    kraknAgent.on('agent_start', () => setState((st) => ({ ...st, working: true })))
    kraknAgent.on('queue_update', (e) => setState((st) => ({ ...st, steering: e.steering, queued: e.queued })))
    kraknAgent.on('usage_update', (e) => setState((st) => ({ ...st, tokens: e.tokens, cost: e.cost })))

    kraknAgent.on('message_end', (e) => {
      if(e.message.role === "assistant") {
        const status = statusFromStopReason(e.message.stopReason)
        setState((st) => ({
          ...st, messages: st.messages.map((m) => m.role === 'assistant' && m.status === 'processing' ? { ...m, status } : m)
        }))
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

    return () => {
      kraknAgent.dispose()
    }
  }, [kraknAgent])

  const pushMessage = (upsertMsg: TuiAgentMessage) => {
    setState((st) => {
      const k = st.messages.findIndex(a => a.id === upsertMsg.id)
      if(k > -1) {
        const updated = (() => {
          const prev = st.messages[k]
          if('content' in prev && 'content' in upsertMsg) {
            return { ...prev, content: prev.content + upsertMsg.content }
          } else if(prev.role === 'tool' && upsertMsg.role === 'tool') {
            return { ...prev, ...upsertMsg, info: { ...prev.info, ...upsertMsg.info } as TuiToolCallAgentMessage['info'] }
          } else {
            return { ...prev, ...upsertMsg }
          }
        })()
        return { ...st, messages: st.messages.map((m, i) => i === k ? updated : m) }
      }

      return { ...st, messages: [...st.messages, upsertMsg] }
    })
  }

  const action: HarnessContextAction = {
    createSession: async (sessionId?: string) => {
      await kraknAgent.newSession(sessionId)
      const model = kraknAgent.currentModel()
      setState((st) => ({ ...st, currentModel: model ? toModelInfo(model) : undefined }))
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
      setState((st) => ({ ...st, currentModel: model ? toModelInfo(model) : undefined }))
    },
    switchThinking: (level: ThinkingLevel) => kraknAgent.switchThinkingLevel(level)
  }

  const messages = state.messages
  const availableModels = useMemo(() => kraknAgent.availableModels().map(toModelInfo), [kraknAgent])
  const usage = useMemo(() => ({ tokens: state.tokens, cost: state.cost }), [state.tokens, state.cost])
  const currentModel = state.currentModel
  const working = state.working
  const queuedPrompts = state.queued
  const steeringPrompts = state.steering
  const availableThinkingLevels = useMemo(() => {
    const levels = new Set<ModelThinkingLevel>()
    for (const model of kraknAgent.availableModels()) {
      for (const level of getSupportedThinkingLevels(model)) levels.add(level)
    }
    return [...levels]
  }, [kraknAgent])

  return (
    <HarnessContext.Provider value={{
      action,
      messages,
      availableModels,
      availableThinkingLevels,
      usage,
      currentModel,
      working,
      queuedPrompts,
      steeringPrompts
    }}>{children}</HarnessContext.Provider>
  )
}