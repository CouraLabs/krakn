import fastGlob from "fast-glob";
import { type Static, Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { resolveToCwd } from "../path-utils";
import type { NodeExecutionEnv } from "../tool-context";
import { loadPrompt } from "../prompt-loader";

const GLOB_DESC = loadPrompt(new URL("../../prompts/glob.md", import.meta.url)).trim();

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

const globSchema = Type.Object({
	pattern: Type.Union(
		[
			Type.String({ description: "glob pattern, e.g. \"src/**/*.{ts,tsx}\"" }),
			Type.Array(Type.String({ description: "glob pattern" })),
		],
		{ description: "Glob pattern or array of patterns (fast-glob syntax)" },
	),
	path: Type.Optional(
		Type.String({
			description: "Directory to search in (relative to cwd or absolute). Defaults to cwd.",
		}),
	),
	absolute: Type.Optional(
		Type.Boolean({ description: "Return absolute paths instead of cwd-relative. Default false." }),
	),
	dot: Type.Optional(
		Type.Boolean({ description: "Match dotfiles (entries starting with '.'). Default false." }),
	),
	ignore: Type.Optional(
		Type.Array(Type.String({ description: "glob pattern to exclude" }), {
			description: "Patterns to ignore. Also consider negative patterns.",
		}),
	),
	caseSensitiveMatch: Type.Optional(
		Type.Boolean({ description: "Case-sensitive matching. Default true." }),
	),
	baseNameMatch: Type.Optional(
		Type.Boolean({
			description:
				"Allow patterns without slashes to match the basename of paths that contain slashes. Default false.",
		}),
	),
	onlyDirectories: Type.Optional(
		Type.Boolean({ description: "Return only directories. Default false." }),
	),
	onlyFiles: Type.Optional(
		Type.Boolean({ description: "Return only files. Default true." }),
	),
	markDirectories: Type.Optional(
		Type.Boolean({ description: "Append '/' to directory paths. Default false." }),
	),
	limit: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: MAX_LIMIT,
			description: `Maximum matches to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`,
		}),
	),
});

export type GlobToolInput = Static<typeof globSchema>;

export interface GlobToolDetails {
	/** Number of matches returned (before truncation). */
	matched: number;
	/** Total matches found (before the limit cut). */
	total: number;
	truncated: boolean;
}

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