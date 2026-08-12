import { resolveToolPath } from "../path-utils.ts";
import type { NodeExecutionEnv } from "../tool-context.ts";
import { getOrThrow, type AgentTool } from "@earendil-works/pi-agent-core";
import { withFileMutationQueue } from "../file-mutation-queue.ts";
import { loadPrompt } from "../prompt-loader.ts";
import { writeSchema } from "./write-types.ts";

const WRITE_DESC = loadPrompt(new URL("../../prompts/write.md", import.meta.url)).trim();

export function createWriteTool(env: NodeExecutionEnv): AgentTool<
	typeof writeSchema,
	undefined
> {
	return {
		name: "write",
		label: "write",
		description: WRITE_DESC,
		parameters: writeSchema,
		async execute(_toolCallId, { path, content }, signal, _onUpdate) {
			const absolutePath = await resolveToolPath(env, path, signal);
			return withFileMutationQueue(env, absolutePath, async () => {
				if (signal?.aborted) throw new Error("Operation aborted");
				getOrThrow(await env.writeFile(absolutePath, content, signal));
				if (signal?.aborted) throw new Error("Operation aborted");
				return {
					content: [{ type: "text", text: `Successfully wrote ${content.length} bytes to ${path}` }],
					details: undefined,
				};
			});
		},
	};
}