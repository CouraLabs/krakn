import type {
	AgentEvent,
	AgentMessage,
	ThinkingLevel,
} from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
import type { ReadToolDetails, ReadToolInput } from "./tools/read/read-types";
import type { HashlineEditToolDetails } from "./tools/edit/edit-types";
import type { EditToolInput } from "./tools/edit/edit";
import type { GrepToolDetails, GrepToolInput } from "./tools/grep/grep-types";
import type { GlobToolDetails, GlobToolInput } from "./tools/glob/glob-types";
import type { WebFetchToolDetails, WebFetchToolInput, WebSearchToolDetails, WebSearchToolInput } from "./tools/web/web-types";
import type { WriteToolInput } from "./tools/write/write-types";

export type KraknAgentEventType = AgentEvent["type"] | "usage_update" | "queue_update";
/** The streamed delta events that carry incremental output text. */
export type UsageDeltaEvent = { type: "text_delta" | "thinking_delta" | "toolcall_delta", delta: string }
/** Cumulative token counters, mirroring the TUI's usage state shape. */
export interface UsageTotals {
  in: number
  out: number
  cr: number
  cw: number
  total: number
}

/** A user prompt waiting to be processed by the agent (steering or follow-up queue). */
export interface QueuedPrompt {
  id: string
  text: string
  when: number
}

/**
 * Fired whenever the cumulative usage changes. During streaming the `out`/`total`
 * counters carry a live estimate built from the streamed deltas; once the assistant
 * `message_end` lands, the real usage replaces that estimate.
 */
export interface UsageUpdateEvent {
  type: "usage_update"
  tokens: UsageTotals
  cost: UsageTotals
}

/**
 * Fired whenever a steering or follow-up prompt is queued, cleared, or drained
 * into the conversation. Carries the pending prompts for both queues.
 */
export interface QueueUpdateEvent {
  type: "queue_update"
  /** Prompts injected while the agent is still working. */
  steering: QueuedPrompt[]
  /** Prompts that run only after the agent would otherwise stop. */
  queued: QueuedPrompt[]
}

/** Callback map for `KraknAgent.on`, pairing each agent event with its typed payload. */
export type KraknAgentEventMap = {
  [K in AgentEvent["type"]]: Extract<AgentEvent, { type: K }>
} & { usage_update: UsageUpdateEvent, queue_update: QueueUpdateEvent }

/** Serialized form of an agent session, persisted to disk as JSON. */
export interface SessionFile {
  /** Identifier used both as the transcript key and the JSON filename (without extension). */
  sessionId: string
  systemPrompt: string
  model: {
    provider: string
    model: string
    thinkingLevel: ThinkingLevel
  }
  messages: AgentMessage[]
  /** Estimated total context tokens at the time of saving. */
  estimateTokens: number
  savedAt: string
}

export interface ProviderConfig {
  id: string
  name?: string
  baseUrl?: string
  headers?: Record<string, string>
  apiKey?: string
  models: Model<Api>[]
}

/** Failed tool execution result. The agent loop returns `{ content:[text], details:{}, isError:true }` on
 *  error, so the tool's normal `details` payload is empty (`{}`) and the error message lives in `content`.
 *  This wraps that message so an errored tool's `out` carries it instead of silently dropping it. */
export type ToolErrorDetails = { error: string }

export type ToolPair = 
  { name: 'read', in: Partial<ReadToolInput>, out: Partial<ReadToolDetails> | ToolErrorDetails } |
  { name: 'edit', in: Partial<EditToolInput>, out: Partial<HashlineEditToolDetails> | ToolErrorDetails } |
  { name: 'write', in: Partial<WriteToolInput> } |
  { name: 'grep', in: Partial<GrepToolInput>, out: Partial<GrepToolDetails> | ToolErrorDetails } |
  { name: 'glob', in: Partial<GlobToolInput>, out: Partial<GlobToolDetails> | ToolErrorDetails } |
  { name: 'websearch', in: Partial<WebSearchToolInput>, out: Partial<WebSearchToolDetails> | ToolErrorDetails } |
  { name: 'webfetch', in: Partial<WebFetchToolInput>, out: Partial<WebFetchToolDetails> | ToolErrorDetails }