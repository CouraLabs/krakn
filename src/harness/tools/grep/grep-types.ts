import { type Static, Type } from "typebox";

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

/** rg --json match event. */
export interface RgMatchEvent {
	type: "match";
	data: {
		path: { text: string };
		line_number: number;
	};
}

export interface RgEvent {
	type: string;
	data: unknown;
}

/** Inclusive range [start, end] of 1-based line numbers. */
export interface LineRange {
	start: number;
	end: number;
}

export interface RgSearchResult {
	matchesByFile: Map<string, number[]>;
	matches: number;
	truncated: boolean;
}

export const grepSchema = Type.Object({
	pattern: Type.String({ description: "Search pattern (regex unless literal: true)" }),
	path: Type.Optional(
		Type.String({ description: "File or directory to search (defaults to cwd)" }),
	),
	glob: Type.Optional(
		Type.String({ description: 'Filename glob filter, e.g. "**/*.ts"' }),
	),
	ignoreCase: Type.Optional(
		Type.Boolean({ description: "Case-insensitive matching" }),
	),
	literal: Type.Optional(
		Type.Boolean({ description: "Treat pattern as a literal string, not a regex" }),
	),
	context: Type.Optional(
		Type.Integer({
			minimum: 0,
			maximum: 5,
			description: "Number of context lines to show around each match (0–5, default 0)",
		}),
	),
	limit: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: MAX_LIMIT,
			description: `Maximum matched lines to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT})`,
		}),
	),
});

export type GrepToolInput = Static<typeof grepSchema>;

export interface GrepToolDetails {
	matches: number;
	files: number;
	truncated: boolean;
}