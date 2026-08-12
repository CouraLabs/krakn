import { type Static, Type } from "typebox";
import {
	DEFAULT_MAX_LENGTH,
	DEFAULT_SEARCH_DEPTH,
	MAX_SEARCH_DEPTH,
} from "./web";

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

export const searchSchema = Type.Object({
	query: Type.String({
		minLength: 1,
		description: "Search query. Natural language or keywords.",
	}),
	depth: Type.Optional(
		Type.Integer({
			minimum: 1,
			maximum: MAX_SEARCH_DEPTH,
			description: `How many results to fetch and return as Markdown (1-${MAX_SEARCH_DEPTH}). Default ${DEFAULT_SEARCH_DEPTH}.`,
		}),
	),
	maxLength: Type.Optional(
		Type.Integer({
			minimum: 1_000,
			description: `Maximum number of Markdown characters to return across all fetched pages. Default ${DEFAULT_MAX_LENGTH}.`,
		}),
	),
});

export type WebSearchToolInput = Static<typeof searchSchema>;

export interface WebSearchToolDetails {
	results: Array<{ title: string; url: string }>;
	depth: number;
	truncated: boolean;
	fetched: number;
	failures: string[];
}

export const fetchSchema = Type.Object({
	url: Type.String({ description: "Full URL to fetch, including scheme (e.g. https://example.com/doc)" }),
	maxLength: Type.Optional(
		Type.Integer({
			minimum: 1_000,
			description: `Maximum number of Markdown characters to return. Default ${DEFAULT_MAX_LENGTH}.`,
		}),
	),
});

export type WebFetchToolInput = Static<typeof fetchSchema>;

export interface WebFetchToolDetails {
	url: string;
	truncated: boolean;
}