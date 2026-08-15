import type { AgentState, ThinkingLevel } from "@earendil-works/pi-agent-core"
import type { ModelCost, ModelThinkingLevel } from "@earendil-works/pi-ai"
import type { TuiAgentMessage } from "../shared/types/tui-harness"
import type { QueuedPrompt, UsageTotals } from "../../harness/harness-types"

export type HarnessState = {
  agent?: AgentState,
  tokens: UsageTotals,
  cost: UsageTotals,
  messages: TuiAgentMessage[],
  working: boolean,
  /** Prompts injected while the agent is still working. */
  steering: QueuedPrompt[],
  /** Prompts that run only after the agent would otherwise stop. */
  queued: QueuedPrompt[],
  /** Active model, present once a session exists. */
  currentModel?: ModelInfo,
}

/** TUI-facing description of a model, shared by `availableModels` and `currentModel`. */
export type ModelInfo = {
  provider: string,
  modelId: string,
  modelName: string,
  contextSize: number,
  thinkingLevels: ModelThinkingLevel[],
  /** Input modalities the model accepts: text and/or vision. */
  supports: ("text" | "image")[],
  costs: ModelCost,
}

export type HarnessContextAction = {
  /** Restore a persisted session by id. A fresh session has no model until `switchModel` is called. */
  createSession: (sessionId?: string) => Promise<void>
  abort: () => void
  /** Send a prompt for immediate processing (text only for now). No-op before a model is selected. */
  prompt: (text: string) => Promise<void>
  /** Queue a prompt to run only after the agent would otherwise stop. No-op before a model is selected. */
  queue: (text: string) => void
  /** Queue a prompt to be injected while the agent is still working. No-op before a model is selected. */
  steer: (text: string) => void
  clearQueue: () => void
  clearSteering: () => void
  /** Select the active model, creating a session with it when none exists yet. */
  switchModel: (provider: string, modelId: string) => Promise<void>
  /** Switch the reasoning level; returns the level actually set (clamped to the model). */
  switchThinking: (level: ThinkingLevel) => ThinkingLevel
}
