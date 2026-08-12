import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy"
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy"
import { azureOpenAIResponsesApi } from "@earendil-works/pi-ai/api/azure-openai-responses.lazy"
import { openAICodexResponsesApi } from "@earendil-works/pi-ai/api/openai-codex-responses.lazy"
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy"
import { bedrockConverseStreamApi } from "@earendil-works/pi-ai/api/bedrock-converse-stream.lazy"
import { googleGenerativeAIApi } from "@earendil-works/pi-ai/api/google-generative-ai.lazy"
import { googleVertexApi } from "@earendil-works/pi-ai/api/google-vertex.lazy"
import { mistralConversationsApi } from "@earendil-works/pi-ai/api/mistral-conversations.lazy"
import { piMessagesApi } from "@earendil-works/pi-ai/api/pi-messages.lazy"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { createProvider, envApiKeyAuth, type Api, type Model, type MutableModels, type ProviderAuth, type ProviderStreams } from "@earendil-works/pi-ai"
import type { ProviderConfig } from "./harness-types"
import { app } from "../globals"

/** Lazy API factory per `KnownApi` value. */
const API_LOADERS: Record<string, () => ProviderStreams> = {
  "openai-completions": openAICompletionsApi,
  "openai-responses": openAIResponsesApi,
  "azure-openai-responses": azureOpenAIResponsesApi,
  "openai-codex-responses": openAICodexResponsesApi,
  "anthropic-messages": anthropicMessagesApi,
  "bedrock-converse-stream": bedrockConverseStreamApi,
  "google-generative-ai": googleGenerativeAIApi,
  "google-vertex": googleVertexApi,
  "mistral-conversations": mistralConversationsApi,
  "pi-messages": piMessagesApi,
}

/** Replace `env:VAR_NAME` literals with `process.env.VAR_NAME` at load time. Shallow — models untouched. */
function resolveEnvStrings(entry: ProviderConfig): void {
  if (entry.baseUrl?.startsWith("env:")) {
    const varName = entry.baseUrl.slice(4)
    entry.baseUrl = process.env[varName] ?? entry.baseUrl
  }
  if (entry.headers) {
    for (const [key, value] of Object.entries(entry.headers)) {
      if (value.startsWith("env:")) {
        const varName = value.slice(4)
        entry.headers[key] = process.env[varName] ?? value
      }
    }
  }
}

/** Load `~/.krakn/providers.json` and register each entry as a provider. */
function loadCustomProviders(models: MutableModels): void {
  const configPath = join(app.settingsPath, "providers.json")
  if (!existsSync(configPath)) return

  let config: ProviderConfig[]
  try {
    config = JSON.parse(readFileSync(configPath, "utf-8")) as ProviderConfig[]
  } catch (error) {
    throw new Error(`Invalid ~/.krakn/providers.json: ${(error as Error).message}`)
  }

  for (const entry of config) {
    resolveEnvStrings(entry)

    const name = entry.name ?? entry.id
    const auth: ProviderAuth = entry.apiKey?.startsWith("env:")
      ? { apiKey: envApiKeyAuth(name, [entry.apiKey.slice(4)]) }
      : entry.apiKey !== undefined
        ? {
            apiKey: {
              name,
              resolve: async ({ signal }) => {
                signal.throwIfAborted()
                return { auth: { apiKey: entry.apiKey }, source: "config" }
              },
            },
          }
        : { apiKey: { name, resolve: async () => undefined } }

    const apis = [...new Set(entry.models.map((m) => m.api))]
    for (const apiId of apis) {
      if (!API_LOADERS[apiId]) throw new Error(`Unknown API '${apiId}' for provider '${entry.id}'`)
    }
    const api: ProviderStreams | Partial<Record<Api, ProviderStreams>> =
      apis.length === 1
        ? API_LOADERS[apis[0]!]()
        : Object.fromEntries(apis.map((a) => [a, API_LOADERS[a]!()]))

    const provider = createProvider({
      id: entry.id,
      name: entry.name,
      baseUrl: entry.baseUrl,
      headers: entry.headers,
      auth,
      models: entry.models,
      api,
    })
    models.setProvider(provider)
  }
}

export {
  loadCustomProviders
}