import type { AgentTool } from "@earendil-works/pi-agent-core";
import { loadPrompt } from "../prompt-loader";
import { throwIfAborted } from "../runtime";
import {
	DEFAULT_MAX_LENGTH,
	DEFAULT_SEARCH_DEPTH,
	MAX_SEARCH_DEPTH,
	fetchPageMarkdown,
	mapLimit,
	truncateText,
	withPage,
} from "./web";
import {
	searchSchema,
	type SearchResult,
	type WebSearchToolDetails,
} from "./web-types";

const SEARCH_DESC = loadPrompt(new URL("../../prompts/websearch.md", import.meta.url))
	.replaceAll("{{MAX_SEARCH_DEPTH}}", String(MAX_SEARCH_DEPTH))
	.replaceAll("{{DEFAULT_SEARCH_DEPTH}}", String(DEFAULT_SEARCH_DEPTH))
	.replaceAll("{{DEFAULT_MAX_LENGTH}}", String(DEFAULT_MAX_LENGTH))
	.trim();

const DDG_SEARCH_URL = "https://html.duckduckgo.com/html/";

/** Run a DuckDuckGo HTML search and parse the top results out of the page. */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
	const url = `${DDG_SEARCH_URL}?q=${encodeURIComponent(query)}`;

	return withPage(async (page) => {
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
		try {
			await page.waitForSelector(".result", { timeout: 15_000 });
		} catch {
			// No results block on the page — fall through and let evaluate decide.
		}

		const results = await page.evaluate((limit: number) => {
			const out: Array<{ title: string; url: string; snippet: string }> = [];
			for (const node of Array.from(document.querySelectorAll(".result"))) {
				if (out.length >= limit) break;
				const anchor = node.querySelector(".result__a");
				if (!anchor) continue;
				const raw = anchor.getAttribute("href") || "";
				const uddg = raw.match(/[?&]uddg=([^&]+)/);
				const url = uddg ? decodeURIComponent(uddg[1]) : raw;
				const snippet = node.querySelector(".result__snippet");
				out.push({
					title: (anchor.textContent || "").trim(),
					url,
					snippet: (snippet?.textContent || "").trim(),
				});
			}
			return out;
		}, maxResults);

		const challenge = await page.evaluate(() => {
			const text = document.body?.textContent || "";
			return /complete the following challenge|unusual traffic|make sure you.{0,40}not a robot|verify you are human|anomaly|security check/i.test(text);
		});
		if (results.length === 0 && challenge) {
			throw new Error(
				"DuckDuckGo served a bot-check/captcha page instead of results. Try again shortly or rephrase the query.",
			);
		}
		return results;
	});
}

export function createWebSearchTool(): AgentTool<typeof searchSchema, WebSearchToolDetails | undefined> {
	return {
		name: "websearch",
		label: "websearch",
		description: SEARCH_DESC,
		parameters: searchSchema,

		async execute(_toolCallId, params, signal?) {
			throwIfAborted(signal);
			const depth = params.depth ?? DEFAULT_SEARCH_DEPTH;
			const limit = params.maxLength ?? DEFAULT_MAX_LENGTH;

			const results = await searchDuckDuckGo(params.query, depth);
			if (results.length === 0) {
				throw new Error(`No results found for query: ${params.query}`);
			}

			// Fetch each result page (bounded concurrency), converting to Markdown.
			const failures: string[] = [];
			const parts: string[] = [];

			await mapLimit(results, 4, async (result) => {
				throwIfAborted(signal);
				try {
					const { markdown, finalUrl } = await fetchPageMarkdown(result.url);
					const redirectNote =
						finalUrl && finalUrl !== result.url ? `\n\n*(resolved to ${finalUrl})*` : "";
					if (markdown) {
						parts.push(
							`## [${result.title}](${result.url})\n\n${markdown}${redirectNote}`,
						);
					}
				} catch (error) {
					failures.push(
						`- **${result.title}** (${result.url}): ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			});

			const snippets = results
				.map((r) => `- [${r.title}](${r.url}): ${r.snippet || "no snippet"}`)
				.join("\n");
			const fetchedBody = parts.join("\n\n---\n\n");

			let body = `# Search: ${params.query}\n\n${snippets}\n\n---\n\n${fetchedBody}`;
			if (failures.length > 0) {
				body += `\n\n## Fetch failures (${failures.length}/${results.length})\n\n${failures.join("\n")}`;
			}

			const { text, truncated } = truncateText(body, limit);
			return {
				content: [{ type: "text", text }],
				details: {
					results: results.map(({ title, url }) => ({ title, url })),
					depth,
					fetched: parts.length,
					truncated,
					failures,
				},
			};
		},
	};
}