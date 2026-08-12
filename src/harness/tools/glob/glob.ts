import fastGlob from "fast-glob";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { resolveToCwd } from "../path-utils";
import type { NodeExecutionEnv } from "../tool-context";
import { loadPrompt } from "../prompt-loader";
import { globSchema, DEFAULT_LIMIT, type GlobToolDetails } from "./glob-types";

const GLOB_DESC = loadPrompt(new URL("../../prompts/glob.md", import.meta.url)).trim();

export function createGlobTool(
	env: NodeExecutionEnv,
): AgentTool<typeof globSchema, GlobToolDetails | undefined> {
	return {
		name: "glob",
		label: "Glob",
		description: GLOB_DESC,
		parameters: globSchema,

		async execute(_toolCallId, params) {
			const pattern = Array.isArray(params.pattern)
				? params.pattern
				: [params.pattern];
			const cwd = params.path ? resolveToCwd(params.path, env.cwd) : env.cwd;
			const limit = params.limit ?? DEFAULT_LIMIT;

			const ignore =
				params.ignore && params.ignore.length > 0 ? params.ignore : undefined;
			const onlyFiles = params.onlyFiles ?? true;

			let matches: string[];
			try {
				matches = await fastGlob(pattern, {
					cwd,
					absolute: Boolean(params.absolute),
					dot: Boolean(params.dot),
					ignore,
					caseSensitiveMatch: params.caseSensitiveMatch,
					baseNameMatch: Boolean(params.baseNameMatch),
					onlyDirectories: Boolean(params.onlyDirectories),
					onlyFiles,
					markDirectories: Boolean(params.markDirectories),
					unique: true,
				});
			} catch (error: unknown) {
				// fast-glob throws on malformed patterns.
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`glob failed: ${message}`);
			}

			// Deterministic ordering for stable output.
			matches.sort();

			const total = matches.length;
			const truncated = total > limit;
			const shown = truncated ? matches.slice(0, limit) : matches;

			let text: string;
			if (shown.length === 0) {
				text = `No matches found for ${JSON.stringify(pattern)} in ${cwd}.`;
			} else {
				text = shown.join("\n");
				if (truncated) {
					text += `\n\n[Showing ${limit} of ${total} matches. Refine the pattern or use a negative/ignore pattern to narrow results.]`;
				}
			}

			return {
				content: [{ type: "text", text }],
				details: {
					matched: shown.length,
					total,
					truncated,
				},
			};
		},
	};
}