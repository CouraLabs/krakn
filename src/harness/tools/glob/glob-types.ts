import { type Static, Type } from "typebox";

export const DEFAULT_LIMIT = 200;
export const MAX_LIMIT = 1000;

export const globSchema = Type.Object({
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