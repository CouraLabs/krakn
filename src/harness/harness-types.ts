import type {
	AgentEvent,
	AgentMessage,
	ThinkingLevel,
} from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";

export type KraknAgentEventType = AgentEvent["type"];

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
  tokens: number
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