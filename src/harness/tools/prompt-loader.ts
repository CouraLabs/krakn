/**
 * Prompt loader with anchor-example rewriting.
 *
 * Prompt files are authored with 2-character hash examples (the default
 * session length). At load time, loadPrompt() rewrites those examples to
 * match the fixed default hash length so that models always see correctly-sized
 * anchor tokens. Because the default is 2, the rewrite is normally identity.
 *
 * Rewriting is one-shot at extension load time (top-level const in each tool
 * file); there is no hot-reload because the hash length does not change at runtime.
 */

import { readFileSync } from "node:fs";
import { DEFAULT_HASH_LENGTH } from "./hashline/hash";

/**
 * Padding characters used to extend example hash tokens beyond 2 characters.
 * These must stay in sync with the exampleAnchor() source in hash.ts:
 *   exampleAnchor source = "MQQV", so padding = "QV" (chars at index 2 and 3).
 */
const EXAMPLE_HASH_PADDING = "QV";

/**
 * Rewrite anchor-shaped example tokens in prompt text to use hashes of the
 * given length.
 *
 * Matches tokens of the form `<digits>#<2-char hash alphabet sequence>` at a
 * word boundary and pads (or leaves as-is for len=2) the hash portion.
 *
 * len=2: identity (no padding needed, the source is 2 chars).
 * len=3: appends "Q"  (first char of EXAMPLE_HASH_PADDING).
 * len=4: appends "QV" (both chars of EXAMPLE_HASH_PADDING).
 */
export function rewriteAnchorExamples(text: string, len: number): string {
	if (len === 2) {
		return text;
	}
	const padding = EXAMPLE_HASH_PADDING.slice(0, len - 2);
	return text.replace(
		/(\d+)#([ZPMQVRWSNKTXJBYH]{2})\b/g,
		(_match, line: string, hash: string) => `${line}#${hash}${padding}`,
	);
}

/**
 * Remove the `replace_text` op bullet and its inline `oldText`/`newText`
 * description from a prompt string. Matches the exact authored line in
 * prompts/edit.md; other prompt files that have no such line are returned
 * unchanged.
 *
 * The authored line is:
 *   - `replace_text` — `{ "op": "replace_text", "oldText": ..., "newText": ... }` …
 *
 * The regex matches the leading `- ` bullet, the op name, and everything to the
 * end of the line, including a trailing newline if present.
 */
export function stripReplaceTextFromPrompt(text: string): string {
	return text.replace(/^- `replace_text`[^\n]*\n?/m, "");
}

/**
 * Read a prompt file and rewrite its anchor examples to match the configured
 * hash length. The rewrite is identity when hash length is 2 (the default),
 * so prompt files keep their authored 2-character anchor examples and match
 * the 2-character hashes `read`/`grep` produce.
 *
 * When replaceText is disabled in config, also strips all replace_text
 * references from the prompt so the model never sees the op as an option.
 */
export function loadPrompt(url: URL): string {
	const text = readFileSync(url, "utf8");
	const withAnchors = rewriteAnchorExamples(text, DEFAULT_HASH_LENGTH);
	return withAnchors;
}

/**
 * Load a guideline file for a tool into a list of bullet lines.
 *
 * Guideline files (`prompts/<tool>-guidelines.md`) are authored as a `- `
 * bullet list. Lines are trimmed and bullets are stripped of the leading
 * `- ` marker. Returns an empty array when the file is missing or has no
 * bullets, so tools without guidelines contribute nothing.
 */
export function loadToolGuidelines(toolName: string): string[] {
	let text: string;
	try {
		text = readFileSync(
			new URL(`../prompts/${toolName}-guidelines.md`, import.meta.url),
			"utf8",
		);
	} catch {
		return [];
	}
	return text
		.split("\n")
		.map((line) => line.trimEnd())
		.filter((line) => line.trimStart().startsWith("- "))
		.map((line) => line.trim().slice(2).trim());
}

/**
 * Build a system-prompt guidelines block for a set of tools.
 *
 * Reads each tool's `prompts/<tool>-guidelines.md` file (if present) and
 * assembles a titled, bulleted section per tool, joined under a single
 * heading. Returns an empty string when no tool contributes guidelines, so
 * callers can safely append the result to the system prompt with a trailing
 * newline without leaving a stray heading.
 *
 * @param tools Tool names to include, in desired display order.
 */
export function buildToolGuidelines(tools: readonly string[]): string {
	const sections: string[] = [];

	for (const tool of tools) {
		const lines = loadToolGuidelines(tool);
		if (lines.length === 0) {
			continue;
		}
		sections.push(`${tool}\n${lines.map((line) => `- ${line}`).join("\n")}`);
	}

	if (sections.length === 0) {
		return "";
	}

	return `# Tool guidelines\n\n${sections.join("\n\n")}`;
}
