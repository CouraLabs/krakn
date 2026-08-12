import type { AgentTool } from "@earendil-works/pi-agent-core";
import { loadPrompt } from "../prompt-loader";
import { throwIfAborted } from "../runtime";
import {
	DEFAULT_MAX_LENGTH,
	fetchPageMarkdown,
	truncateText,
} from "./web";
import {
	fetchSchema,
	type WebFetchToolDetails,
} from "./web-types";

const FETCH_DESC = loadPrompt(new URL("../../prompts/webfetch.md", import.meta.url))
	.replaceAll("{{DEFAULT_MAX_LENGTH}}", String(DEFAULT_MAX_LENGTH))
	.trim();

export function createWebFetchTool(): AgentTool<typeof fetchSchema, WebFetchToolDetails | undefined> {
	return {
		name: "webfetch",
		label: "webfetch",
		description: FETCH_DESC,
		parameters: fetchSchema,

		async execute(_toolCallId, params, signal?) {
			throwIfAborted(signal);
			const { markdown, finalUrl } = await fetchPageMarkdown(params.url);

			if (!markdown) {
				throw new Error(`No readable content extracted from ${params.url} (reached ${finalUrl}). The page may be empty or block automated access.`);
			}

			const limit = params.maxLength ?? DEFAULT_MAX_LENGTH;
			const { text, truncated } = truncateText(markdown, limit);
			return {
				content: [{ type: "text", text }],
				details: { url: finalUrl, truncated },
			};
		},
	};
}