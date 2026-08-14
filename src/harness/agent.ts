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
  type Api,
  type AuthEvent,
  type AuthInteraction,
  type AuthPrompt,
  type Credential,
  type ImageContent,
  type Model,
  type MutableModels
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
import type { KraknAgentEventMap, KraknAgentEventType, QueuedPrompt, SessionFile } from "./harness-types"
import { app } from "../globals"
import { UsageLedger } from "./usage-ledger"

/** A queued prompt as tracked by the agent: UI metadata plus the message handed to the agent. */
type QueuedPromptEntry = QueuedPrompt & { msg: AgentMessage }

export class KraknAgent {
  private ledger = new UsageLedger()

  private env: NodeExecutionEnv
  private sessionId?: string
  private agent?: Agent
  private models: MutableModels
  private unsubscribe: (() => void) = () => {}
  private rl?: Interface
  /** Mirror of the agent's steering queue: prompts injected while the agent is working. */
  private steeringMirror: QueuedPromptEntry[] = []
  /** Mirror of the agent's follow-up queue: prompts that run after the agent stops. */
  private followUpMirror: QueuedPromptEntry[] = []

  /** Registered event callbacks. Payloads are erased here; `on()` restores the per-key type at the boundary. */
  private eventHooks: Map<keyof KraknAgentEventMap, (event: unknown) => void> = new Map()

  constructor(cwd: string) {
    if(!cwd) throw new Error('Path not set')
    this.env = new NodeExecutionEnv({
      cwd: cwd, 
      shellEnv: this.safeProcessEnv(), 
      shellPath: app.shell.path
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
    this.steeringMirror = []
    this.followUpMirror = []
  }

  /** Abort the current run. Safe to call when no session or run is active. */
  abort(): void {
    this.agent?.abort()
  }

  genSessionId(): string {
    return `${this.normalizeCwd()}-${ulid()}`
  }

  async newSession(sessionId?: string, model?: string) {
    if(this.sessionId) throw new Error(`Session is already created`)

    let selectedModel: Model<Api> | undefined
    if(model) {
      const [ provider, modelId ] = model.split('/');
      if(!provider || !modelId) throw new Error(`Invalid model: ${model}`)
      selectedModel = this.models.getModel(provider, modelId)
      if (!selectedModel) throw new Error(`Model not loaded: ${model}`)
    }

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

    // A fresh session needs a model up front; a restored one falls back to its persisted model.
    const sessionModel = restored.model ?? selectedModel
    if (!sessionModel) throw new Error(`No model selected`)

    this.sessionId = sessionId ?? this.genSessionId()

    this.agent = new Agent({
      sessionId: ulid(),
      initialState: {
        systemPrompt: restored.systemPrompt ?? this.buildSystemPrompt(toolNames),
        model: sessionModel,
        thinkingLevel: restored.thinkingLevel ?? 'off',
        tools,
        messages: restored.messages,
      },
      streamFn: this.models.streamSimple.bind(this.models),
      toolExecution: 'parallel',
    })

    this.unsubscribe = this.agent.subscribe((event: Extract<AgentEvent, { type: KraknAgentEventType }>) => {
      if (event.type === 'message_end' && event.message.role === 'user') {
        // A queued steering/follow-up prompt was drained into the transcript.
        this.reconcileQueues()
      }

      if (event.type === 'agent_end') {
        this.saveSession().catch((err) => {
          console.error('Failed to save session:', err)
        })
      }

      if (event.type === 'message_update') {
        const ev = event.assistantMessageEvent
        if (ev.type === 'text_delta' || ev.type === 'thinking_delta' || ev.type === 'toolcall_delta') {
          this.eventHooks.get('usage_update')?.(this.ledger.trackDelta(ev))
        }
      } else if (event.type === 'message_end' && event.message.role === 'assistant') {
        this.eventHooks.get('usage_update')?.(this.ledger.commit(event.message.usage))
      }

      this.eventHooks.get(event.type)?.(event);
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
      estimateTokens: context.estimateTokens.tokens,
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

  on<K extends keyof KraknAgentEventMap>(key: K, cb: (event: KraknAgentEventMap[K]) => void) {
    // The map erases per-key payloads; the callback contract is restored by `KraknAgentEventMap[K]`.
    this.eventHooks.set(key, cb as (event: unknown) => void)
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
    return this.models.getModels(provider).slice()
  }

  /** The active model, or undefined before a session exists. */
  currentModel(): Model<Api> | undefined {
    return this.agent?.state.model
  }

  /**
   * Select the active model. With a live session the model is swapped in place
   * (thinking level clamped); without one, a session is created with the model.
   */
  async switchModel(provider: string, modelId: string): Promise<Model<Api>> {
    const model = this.models.getModel(provider, modelId)
    if (!model) throw new Error(`Model not found: ${provider}/${modelId}`)

    if (!this.agent) {
      await this.newSession(undefined, `${provider}/${modelId}`)
      return model
    }

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

  /** List providers that offer an interactive OAuth login flow. */
  oauthProviders(): { id: string, name: string }[] {
    return this.models
      .getProviders()
      .filter((provider) => provider.auth.oauth)
      .map((provider) => ({ id: provider.id, name: provider.name }))
  }

  /** Registered provider identities (id and display name). */
  providers(): { id: string, name: string }[] {
    return this.models
      .getProviders()
      .map((provider) => ({ id: provider.id, name: provider.name }))
  }

  async prompt(input: string, images?: ImageContent[]) {
    if (!this.agent) throw new Error(`Agent not initilized`)
    if(this.agent.state.isStreaming) throw new Error(`Agent is processing`)
    await this.agent.prompt(input, images)
  }

  /** Queue a prompt to be injected into the conversation while the agent is still working. */
  steer(text: string): QueuedPrompt {
    const agent = this.agent
    if (!agent) throw new Error(`Agent not initilized`)
    const entry = this.newQueuedPrompt(text)
    agent.steer(entry.msg)
    this.steeringMirror.push(entry)
    this.emitQueueUpdate()
    return entry
  }

  /** Queue a prompt to run only after the agent would otherwise stop. */
  queue(text: string): QueuedPrompt {
    const agent = this.agent
    if (!agent) throw new Error(`Agent not initilized`)
    const entry = this.newQueuedPrompt(text)
    agent.followUp(entry.msg)
    this.followUpMirror.push(entry)
    this.emitQueueUpdate()
    return entry
  }

  /** Remove all queued steering prompts. */
  clearSteering(): void {
    this.agent?.clearSteeringQueue()
    if (this.steeringMirror.length > 0) {
      this.steeringMirror = []
      this.emitQueueUpdate()
    }
  }

  /** Remove all queued follow-up prompts. */
  clearQueue(): void {
    this.agent?.clearFollowUpQueue()
    if (this.followUpMirror.length > 0) {
      this.followUpMirror = []
      this.emitQueueUpdate()
    }
  }

  /** Build a queued prompt: the user message handed to the agent plus UI metadata. */
  private newQueuedPrompt(text: string): QueuedPromptEntry {
    return {
      id: ulid(),
      text,
      when: Date.now(),
      msg: { role: "user", content: text, timestamp: Date.now() },
    }
  }

  /**
   * Drop mirror entries whose message has been drained into the transcript.
   * Drained prompts surface as `message_end` events carrying the same message
   * object that was queued, so reference equality against the transcript is exact.
   */
  private reconcileQueues(): void {
    if (!this.agent) return
    const transcript = this.agent.state.messages
    const before = this.steeringMirror.length + this.followUpMirror.length
    this.steeringMirror = this.steeringMirror.filter((e) => !transcript.includes(e.msg))
    this.followUpMirror = this.followUpMirror.filter((e) => !transcript.includes(e.msg))
    const after = this.steeringMirror.length + this.followUpMirror.length
    if (before !== after) this.emitQueueUpdate()
  }

  private emitQueueUpdate(): void {
    this.eventHooks.get("queue_update")?.({
      type: "queue_update",
      steering: this.steeringMirror.map(({ id, text, when }) => ({ id, text, when })),
      queued: this.followUpMirror.map(({ id, text, when }) => ({ id, text, when })),
    })
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
    const shellLabel = app.shell.kind === app.shell.name ? app.shell.kind : `${app.shell.kind} (${app.shell.name})`
    // Function replacements so `$` in paths never triggers substitution patterns.
    return template
      .replace('{{tools_guidelines}}', () => toolsGuide)
      .replace('{{workspace}}', () => app.cwd)
      .replace('{{os}}', () => `${app.os.name} ${app.os.release} (${app.os.arch})`)
      .replace('{{shell}}', () => shellLabel)
  }

  public getContext(): { 
    systemPrompt: string, 
    messages: AgentMessage[],
    tools: AgentTool[],
    estimateTokens: {
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
      estimateTokens: estimateContextTokens(state.messages),
      tools: state.tools,
      messages: state.messages,
    }
  }
}

const createKraknAgent = (cwd: string) => {
  return new KraknAgent(cwd)
}

export { 
  type KraknAgentEventType,
  createKraknAgent,
  UsageLedger 
}