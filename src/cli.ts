import { Command } from "commander";
import { createInterface } from "node:readline";
import process from "node:process";
import { render } from "@opentui/solid";
import { createKraknAgent, KraknAgent } from "./harness/agent";
import { App } from "./tui/App";

interface LoginOption {
  login?: string | boolean
}

/**
 * Providers that can auto-connect from environment variables, keyed by
 * registered provider id. Mirror of the env table documented in
 * `@earendil-works/pi-ai`'s README.
 */
const ENV_KEYS: Record<string, string[]> = {
  "ant-ling": ["ANT_LING_API_KEY"],
  "anthropic": ["ANTHROPIC_API_KEY", "ANTHROPIC_OAUTH_TOKEN"],
  "azure-openai-responses": ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_BASE_URL"],
  "baseten": ["BASETEN_API_KEY"],
  "cerebras": ["CEREBRAS_API_KEY"],
  "cloudflare-ai-gateway": ["CLOUDFLARE_API_KEY", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_GATEWAY_ID"],
  "cloudflare-workers-ai": ["CLOUDFLARE_API_KEY", "CLOUDFLARE_ACCOUNT_ID"],
  "deepseek": ["DEEPSEEK_API_KEY"],
  "fireworks": ["FIREWORKS_API_KEY"],
  "github-copilot": ["COPILOT_GITHUB_TOKEN"],
  "google": ["GEMINI_API_KEY"],
  "google-vertex": ["GOOGLE_CLOUD_API_KEY"],
  "groq": ["GROQ_API_KEY"],
  "huggingface": ["HF_TOKEN"],
  "kimi-coding": ["KIMI_API_KEY"],
  "minimax": ["MINIMAX_API_KEY"],
  "minimax-cn": ["MINIMAX_CN_API_KEY"],
  "mistral": ["MISTRAL_API_KEY"],
  "moonshotai": ["MOONSHOT_API_KEY"],
  "moonshotai-cn": ["MOONSHOT_API_KEY"],
  "nvidia": ["NVIDIA_API_KEY"],
  "openai": ["OPENAI_API_KEY"],
  "opencode": ["OPENCODE_API_KEY"],
  "opencode-go": ["OPENCODE_API_KEY"],
  "openrouter": ["OPENROUTER_API_KEY"],
  "qwen-token-plan": ["QWEN_TOKEN_PLAN_API_KEY"],
  "qwen-token-plan-cn": ["QWEN_TOKEN_PLAN_CN_API_KEY"],
  "qwen-token-plan-individual": ["QWEN_TOKEN_PLAN_API_KEY"],
  "together": ["TOGETHER_API_KEY"],
  "vercel-ai-gateway": ["AI_GATEWAY_API_KEY"],
  "xai": ["XAI_API_KEY"],
  "xiaomi": ["XIAOMI_API_KEY"],
  "xiaomi-token-plan-ams": ["XIAOMI_TOKEN_PLAN_AMS_API_KEY"],
  "xiaomi-token-plan-cn": ["XIAOMI_TOKEN_PLAN_CN_API_KEY"],
  "xiaomi-token-plan-sgp": ["XIAOMI_TOKEN_PLAN_SGP_API_KEY"],
  "zai": ["ZAI_API_KEY"],
  "zai-coding-cn": ["ZAI_CODING_CN_API_KEY"],
}

const program = new Command();

program
  .name("krakn")
  .description("Krakn - a terminal coding agent")
  .helpOption("-h, --help", "display help for command")
  .option("-l, --login [provider]", "authenticate via OAuth to a provider (optionally naming its id)");

program.addHelpText("after", () => buildEnvHelp(new KraknAgent(process.cwd())));

program.action(async () => {
  const { login } = program.opts<LoginOption>();

  if (login) {
    await runLogin(login)
    return
  }

  // No flags: launch the TUI.
  render(App, {
    useThread: true,
    openConsoleOnError: true,
    exitOnCtrlC: true,
    onDestroy: () => process.exit(0)
  })
})

program.parse()

async function runLogin(login: string | boolean) {
  const agent = await createKraknAgent(process.cwd())
  try {
    const providers = agent.oauthProviders()
    if (providers.length === 0) {
      console.error("No providers with interactive OAuth login are registered.")
      process.exit(1)
    }

    let providerId: string
    if (typeof login === "string") {
      providerId = login
      if (!providers.some((p) => p.id === providerId)) {
        console.error(`Unknown or non-OAuth provider: ${providerId}`)
        process.exit(1)
      }
    } else {
      providerId = await selectProvider(providers)
    }

    const credential = await agent.authenticateOAuth(providerId)
    console.log(`Authenticated ${providerId} (${credential.type}).`)
  } catch (error) {
    console.error(`Login failed: ${(error as Error).message}`)
    process.exit(1)
  } finally {
    agent.dispose()
  }
}

function buildEnvHelp(agent: KraknAgent): string {
  const byId = new Map(agent.providers().map((p) => [p.id, p]))
  const lines: string[] = []
  for (const [id, keys] of Object.entries(ENV_KEYS)) {
    const provider = byId.get(id)
    if (!provider) continue
    lines.push(`  ${provider.name}: ${keys.join(", ")}`)
  }
  if (lines.length === 0) return ""
  return `\nProviders that auto-connect from environment variables:\n${lines.join("\n")}`
}

function selectProvider(providers: { id: string, name: string }[]): Promise<string> {
  console.log("Select an OAuth provider:")
  providers.forEach((provider, index) => {
    console.log(`  ${index + 1}. ${provider.name} (${provider.id})`)
  })

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve, reject) => {
    rl.question("Provider: ", (answer) => {
      rl.close()
      const index = Number.parseInt(answer, 10) - 1
      const selected = providers[index]
      if (!selected) {
        reject(new Error("Invalid selection"))
        return
      }
      resolve(selected.id)
    })
  })
}