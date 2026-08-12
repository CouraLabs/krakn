import { builtinModels } from "@earendil-works/pi-ai/providers/all"
import { 
  Agent,
  estimateContextTokens,
  type AgentEvent, 
  type AgentMessage, 
  type AgentTool, 
  type ThinkingLevel 
} from "@earendil-works/pi-agent-core"
import {
  clampThinkingLevel,
  getSupportedThinkingLevels,
  type Api,
  type AuthEvent,
  type AuthInteraction,
  type AuthPrompt,
  type Credential,
  type ImageContent,
  type Model,
  type ModelCost,
  type ModelThinkingLevel,
  type MutableModels,
} from "@earendil-works/pi-ai"

import process from "node:process"
import { createInterface, type Interface } from "node:readline"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { ulid } from "ulid"
import { FileCredentialStore } from "./file-credential-store"
import { loadCustomProviders } from "./provider"
import { NodeExecutionEnv } from "./tools/tool-context"
import { createBashTool } from "./tools/bash/bash"
import { createGlobTool } from "./tools/glob/glob"
import { createWriteTool } from "./tools/write/write"
import { buildToolGuidelines, loadPrompt } from "./tools/prompt-loader"
import { createEditTool } from "./tools/edit/edit"
import { createGrepTool } from "./tools/grep/grep"
import { createReadTool } from "./tools/read/read"
import { createWebFetchTool } from "./tools/web/web-fetch"
import { createWebSearchTool } from "./tools/web/web-search"
import type { KraknAgentEventType, SessionFile } from "./harness-types"
import { app } from "../globals"

class KraknAgent {
  private env: NodeExecutionEnv
  private sessionId?: string
  private agent?: Agent
  private models: MutableModels
  private unsubscribe: (() => void) = () => {}
  private rl?: Interface
  private eventHooks: Map<KraknAgentEventType, (event: any) => void> = new Map()

  constructor(cwd: string) {
    if(!cwd) throw new Error('Path not set')
    this.env = new NodeExecutionEnv({
      cwd: cwd, 
      shellEnv: this.safeProcessEnv(), 
      shellPath: cwd
    })
    const result = builtinModels({ credentials: new FileCredentialStore() })
    loadCustomProviders(result)
    this.models = result
  }

  dispose(): void {
    this.sessionId = undefined
    this.eventHooks.clear()
    this.unsubscribe()
    this.agent?.abort()
  }

  interrupt(): void {
    if (!this.agent) throw new Error(`Agent not initilized`)
    this.agent.abort()
  }

  genSessionId(): string {
    return `${this.normalizeCwd()}-${ulid()}`
  }

  async newSession(sessionId?: string, model?: Model<Api>) {
    if(this.sessionId) throw new Error(`Session is already created`)
    this.sessionId = sessionId ?? this.genSessionId()

    const selectedModel = model ?? this.models.getModel("opencode-go", "deepseek-v4-flash")
    if (!selectedModel) throw new Error("model not loaded")

    const tools = [
      createBashTool(this.env),
      createWriteTool(this.env),
      createReadTool(this.env),
      createEditTool(this.env),
      createGlobTool(this.env),
      createGrepTool(this.env),
      createWebFetchTool(),
      createWebSearchTool()
    ]
    
    const toolNames = tools.map((tool) => tool.name)

    // When a sessionId is provided, restore the persisted transcript, prompt and model.
    let restored: Partial<Pick<SessionFile, "systemPrompt" | "messages">> & {
      model?: Model<Api>;
      thinkingLevel?: ThinkingLevel;
    } = {}
    if (sessionId) {
      const saved = await this.loadSession(sessionId)
      restored = {
        systemPrompt: saved.systemPrompt,
        messages: saved.messages,
        model: this.models.getModel(saved.model.provider, saved.model.model) ?? selectedModel,
        thinkingLevel: saved.model.thinkingLevel,
      }
    }

    this.agent = new Agent({
      sessionId: ulid(),
      initialState: {
        systemPrompt: restored.systemPrompt ?? this.buildSystemPrompt(toolNames),
        model: restored.model ?? selectedModel,
        thinkingLevel: restored.thinkingLevel ?? 'off',
        tools,
        messages: restored.messages,
      },
      streamFn: this.models.streamSimple.bind(this.models),
      toolExecution: 'sequential',
    })

    this.unsubscribe = this.agent.subscribe((event: Extract<AgentEvent, { type: KraknAgentEventType }>) => {
      this.eventHooks.get(event.type)?.(event);
      // Persist the session once the run has fully finished.
      if (event.type === 'agent_end') {
        this.saveSession().catch((err) => {
          console.error('Failed to save session:', err)
        })
      }
    })
  }

  /** Directory where serialized sessions are persisted. */
  private sessionsDir(): string {
    return path.join(app.settingsPath, 'sessions')
  }

  private sessionPath(sessionId: string): string {
    return path.join(this.sessionsDir(), `${sessionId}.json`)
  }

  /** Serialize the current agent context to a JSON session file. Returns the session id. */
  async saveSession(): Promise<string> {
    if (!this.agent) throw new Error(`Agent not initilized`)

    const context = this.getContext()
    const model = this.agent.state.model
    const sessionId = this.sessionId ?? this.genSessionId()

    const session: SessionFile = {
      sessionId,
      systemPrompt: context.systemPrompt,
      model: {
        provider: model.provider,
        model: model.name ?? model.provider,
        thinkingLevel: this.agent.state.thinkingLevel,
      },
      messages: context.messages,
      tokens: context.tokens.tokens,
      savedAt: new Date().toISOString(),
    }

    await mkdir(this.sessionsDir(), { recursive: true })
    await writeFile(this.sessionPath(sessionId), JSON.stringify(session, null, 2), 'utf8')
    return sessionId
  }

  /** Load a previously persisted session file. */
  private async loadSession(sessionId: string): Promise<SessionFile> {
    const raw = await readFile(this.sessionPath(sessionId), 'utf8')
    return JSON.parse(raw) as SessionFile
  }

  on<K extends KraknAgentEventType>(key: K, cb: (event: Extract<AgentEvent, { type: K }>) => void) {
    this.eventHooks.set(key, cb)
  }

  /** Switch the agent's reasoning level, gated on model support. Returns what was actually set. */
  switchThinkingLevel(level: ThinkingLevel): ThinkingLevel {
    if (!this.agent?.state.model.thinkingLevelMap) return "off"
    const clamped = clampThinkingLevel(this.agent.state.model, level)
    this.agent.state.thinkingLevel = clamped
    return clamped
  }

  /** Enumerate the models the configured providers know about. Returns a copy. */
  availableModels(provider?: string): Model<Api>[] {
    if (!this.agent) throw new Error(`Agent not initilized`)
    return this.models.getModels(provider).slice()
  }

  model(): { 
    provider: string, 
    model: string, 
    thinkingLevels: ModelThinkingLevel[], 
    contextSize: number,
    cost: ModelCost
  } {
    if (!this.agent) throw new Error(`Agent not initilized`)
      
    const model = this.agent.state.model

    return {
      provider: model.provider,
      model: model.name ?? model.provider,
      contextSize: model.contextWindow,
      thinkingLevels: getSupportedThinkingLevels(model),
      cost: model.cost
    }
  }

  /** Switch the active model at runtime. Clamps the thinking level to the new model. */
  switchModel(provider: string, modelId: string): Model<Api> {
    if (!this.agent) throw new Error(`Agent not initilized`)
    const model = this.models.getModel(provider, modelId)
    if (!model) throw new Error(`Model not found: ${provider}/${modelId}`)
    this.agent.state.model = model
    if (model.thinkingLevelMap) {
      this.agent.state.thinkingLevel = clampThinkingLevel(model, this.agent.state.thinkingLevel)
    } else {
      this.agent.state.thinkingLevel = "off"
    }
    return model
  }

  /** Run a provider-owned OAuth login flow and persist the credential. */
  async authenticateOAuth(providerId: string): Promise<Credential> {
    const provider = this.models.getProvider(providerId)
    if (!provider) throw new Error(`Unknown provider: ${providerId}`)
    if (!provider.auth.oauth) throw new Error(`Provider ${providerId} does not support OAuth`)

    this.rl = createInterface({ input: process.stdin, output: process.stdout })
    try {
      const interaction: AuthInteraction = {
        signal: new AbortController().signal,
        prompt: (p) => this.answerPrompt(p),
        notify: (e) => this.notifyEvent(e),
      }
      return await this.models.login(providerId, "oauth", interaction)
    } finally {
      this.rl?.close()
      this.rl = undefined
    }
  }

  async prompt(input: string, images?: ImageContent[]) {
    if (!this.agent) throw new Error(`Agent not initilized`)
    if(this.agent.state.isStreaming) throw new Error(`Agent is processing`)
    await this.agent.prompt(input, images)
  }

  private normalizeCwd(): string {
    return this.env.cwd
      .replaceAll('\\', '-')
      .replaceAll('/', '-')
      .replaceAll(':', '-')
      .replaceAll('~', '-')
      .replaceAll('$', '-')
      .replaceAll('%', '-')
      .replaceAll('_', '-')
      .toLocaleLowerCase()
  }

  private answerPrompt(prompt: AuthPrompt): Promise<string> {
    if (prompt.type === "select") {
      console.log(`\n${prompt.message}`)
      prompt.options.forEach((option, index) => {
        console.log(`  ${index + 1}. ${option.label}`)
      })
      return this.question(`Enter number (1-${prompt.options.length}): `).then((input) => {
        const choice = Number.parseInt(input, 10) - 1
        const selected = prompt.options[choice]
        if (!selected) throw new Error("Invalid selection")
        return selected.id
      })
    }
    return this.question(`${prompt.message}${prompt.placeholder ? ` (${prompt.placeholder})` : ""}: `)
  }

  private question(query: string): Promise<string> {
    const { promise, resolve } = Promise.withResolvers<string>()
    this.rl!.question(query, resolve)
    return promise
  }

  private notifyEvent(event: AuthEvent): void {
    switch (event.type) {
      case "auth_url":
        console.log(`\nOpen this URL in your browser:\n${event.url}`)
        if (event.instructions) console.log(event.instructions)
        break
      case "device_code":
        console.log(`\nOpen this URL in your browser:\n${event.verificationUri}`)
        console.log(`Enter code: ${event.userCode}`)
        break
      case "info":
        console.log(event.message)
        for (const link of event.links ?? []) {
          console.log(`${link.label ?? "More information"}: ${link.url}`)
        }
        break
      case "progress":
        console.log(event.message)
        break
    }
  }

  private safeProcessEnv(): NodeJS.ProcessEnv {
    const sensitiveWords = ['api','apikey','api_key','secret','authorization','auth','token','path']
    const currentEnv = process.env
    const keys = Object.keys(currentEnv)
    let safeEnv = {}
    keys.forEach((k) => {
      const ki = k.toLocaleLowerCase()
      if(!sensitiveWords.includes(ki)) {
        safeEnv = { ...safeEnv, [k]: currentEnv[k] }
      }
    })
    return safeEnv
  }

  private buildSystemPrompt(toolNames: string[]) {
    const template = loadPrompt(new URL("./prompts/system.md", import.meta.url))
    const toolsGuide = buildToolGuidelines(toolNames)
    return template.replace('{{tools_guidelines}}', toolsGuide)
  }

  private getContext(): { 
    systemPrompt: string, 
    messages: AgentMessage[],
    tools: AgentTool[],
    tokens: {
      /** Estimated total context tokens. */
      tokens: number;
      /** Tokens reported by the most recent assistant usage block. */
      usageTokens: number;
      /** Estimated tokens after the most recent assistant usage block. */
      trailingTokens: number;
      /** Index of the message that provided usage, or null when none exists. */
      lastUsageIndex: number | null;
    }
  } {
    if (!this.agent) throw new Error(`Agent not initilized`)
    const state = this.agent?.state

    return {
      systemPrompt: state.systemPrompt,
      tokens: estimateContextTokens(state.messages),
      tools: state.tools,
      messages: state.messages,
    }
  }
}

const createKraknAgent = async (cwd: string) => {
  return new KraknAgent(cwd)
}

export { 
  type KraknAgent,
  type KraknAgentEventType,
  createKraknAgent 
}