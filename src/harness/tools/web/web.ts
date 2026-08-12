/**
 * Shared plumbing for the `webfetch` and `websearch` tools.
 *
 * Three responsibilities live here:
 *
 * 1. A lazily-launched, process-wide Puppeteer browser so concurrent fetches
 *    reuse one Chrome instance. The agent runs tools sequentially, so a single
 *    shared browser is all we need.
 * 2. `cleanBodyHtml` — strip the maximum amount of non-content HTML (doctype,
 *    metadata, scripts, styles, chrome/navigation chrome) down to the bodies
 *    content before it is converted, so Turndown sees only meaningful markup.
 * 3. `htmlToMarkdown` — Turndown conversion with content-faithful rules.
 */

import TurndownService from "turndown";
import { createDocument } from "@mixmark-io/domino";
import puppeteer, { type Browser, type Page } from "puppeteer";

/** Hard ceiling on search depth. */
export const MAX_SEARCH_DEPTH = 10;
export const DEFAULT_SEARCH_DEPTH = 5;

export const DEFAULT_MAX_LENGTH = 100_000;
export const NAV_TIMEOUT_MS = 45_000;

/**
 * Realistic desktop Chrome UA. Puppeteer's default headless UA is
 * fingerprint-blocked by many sites (including DuckDuckGo's HTML endpoint);
 * presenting as regular Chrome avoids bot/captcha gates while still being
 * honest automation.
 */
const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Truncate text to `maxLength`, appending a notice when anything was cut. */
export function truncateText(
	text: string,
	maxLength: number,
): { text: string; truncated: boolean } {
	if (text.length <= maxLength) return { text, truncated: false };
	const cut = text.slice(0, maxLength);
	return {
		text: `${cut.trimEnd()}\n\n[Output truncated: showing first ${maxLength} of ${text.length} characters.]`,
		truncated: true,
	};
}

/** Selectors stripped from the body before conversion (highest-noise first). */
const REMOVE_SELECTORS = [
	// Foreign/embedded content that never contributes readable text.
	"script",
	"style",
	"noscript",
	"template",
	"svg",
	"canvas",
	"iframe",
	"object",
	"embed",
	"applet",
	"audio",
	"video",
	"picture",
	"source",
	"track",
	// Interactive chrome — turndown cannot render it and it leaks placeholder text.
	"form",
	"input",
	"textarea",
	"select",
	"button",
	"option",
	"label",
	"nav",
	"header",
	"footer",
	"aside",
	"menu",
	"banner",
	// Head-only metadata that occasionally leaks into body markup.
	"link",
	"meta",
	"title",
	"base",
	"head",
	// Common ad/decoration hooks.
	".ad",
	".ads",
	".advert",
	".advertisement",
	".banner-ad",
	// Explicitly hidden content.
	'[hidden]',
	'[aria-hidden="true"]',
];

/** Attributes irrelevant to Markdown output that inflate the conversion. */
const STRIP_ATTRIBUTE_PATTERN =
	/^(on[a-z]+|class|id|style|data-[a-z]+|aria-.+|role|tabindex|js\w*)$/i;

// Lazily-initialised shared browser and pending init promise.
let browserPromise: Promise<Browser> | undefined;

/** Launch (once) and reuse a headless browser. */
export function getBrowser(): Promise<Browser> {
	if (!browserPromise) {
		browserPromise = puppeteer.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-gpu",
			],
		});
	}
	return browserPromise;
}

/** Close the shared browser, if it was ever launched. Safe to call multiple times. */
export async function closeBrowser(): Promise<void> {
	if (!browserPromise) return;
	const browser = await browserPromise;
	browserPromise = undefined;
	await browser.close().catch(() => {});
}

/**
 * Strip everything non-content from a `<body>` HTML string, keeping only the
 * meaningful body content. Robustly parses the fragment into a real DOM (via
 * domino), removes chrome/metadata/interactive nodes, scrubs non-semantic
 * attributes, and serialises the surviving body markup.
 */
export function cleanBodyHtml(html: string): string {
	if (!html) return "";

	// Wrap so a bare fragment is always attributed to <body>, then strip any
	// stray doctype/XML prolog so it can never survive into the output.
	const doc = createDocument(`<body>${stripDoctype(html)}</body>`);
	const body = doc.body;
	if (!body) return "";

	for (const selector of REMOVE_SELECTORS) {
		for (const el of Array.from(body.querySelectorAll(selector))) {
			el.remove();
		}
	}
	stripAttributes(body);

	const output = collapsePattern(body.innerHTML);
	return output.trim();
}

/** Remove a leading XML/HTML doctype so it can never survive conversion. */
function stripDoctype(html: string): string {
	return html.replace(/^\s*<!doctype[^>]*>/i, "").replace(/^\s*<\?xml[^>]*\?>/i, "");
}

/** Remove event handlers and presentational attributes from the whole tree. */
function stripAttributes(root: { querySelectorAll(selector: string): unknown[] }): void {
	const elements = Array.from(root.querySelectorAll("*")) as Array<{
		attributes: ArrayLike<{ name: string }>;
		removeAttribute(name: string): void;
	}>;
	for (const el of elements) {
		// Snapshot names first: `attributes` is a live NamedNodeMap, so mutating
		// it while walking by index would skip entries.
		const names = Array.from({ length: el.attributes.length }, (_, i) => el.attributes[i]!.name);
		for (const name of names) {
			if (STRIP_ATTRIBUTE_PATTERN.test(name)) el.removeAttribute(name);
		}
	}
}

/** Collapse runs of blank lines and control whitespace into single newlines. */
function collapsePattern(text: string): string {
	return (
		text
			.replace(/\r\n?/g, "\n")
			// Only-whitespace lines become blank lines.
			.replace(/[ \t]{2,}/g, " ")
			.replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n")
	);
}

// Shared Turndown instance — stateless conversion, safe to reuse.
const turndown = new TurndownService({
	headingStyle: "atx",
	hr: "---",
	bulletListMarker: "-",
	codeBlockStyle: "fenced",
	emDelimiter: "*",
	strongDelimiter: "**",
	linkStyle: "inlined",
});

/**
 * Convert a body-HTML string to Markdown. Cleans first, then converts. Returns
 * an empty string when the page had no extractable text.
 */
export function htmlToMarkdown(html: string): string {
	const cleaned = cleanBodyHtml(html);
	if (!cleaned) return "";
	return turndown.turndown(cleaned).trim();
}

/**
 * Navigate to a URL and return its body as Markdown. Uses
 * `document.body.innerHTML` so JavaScript-heavy (SPA) pages are captured after
 * a post-load settle, then cleans and converts.
 */
export async function fetchPageMarkdown(url: string): Promise<{ markdown: string; finalUrl: string }> {
	return withPage(async (page) => {
		const response = await page.goto(url, {
			waitUntil: "networkidle2",
			timeout: NAV_TIMEOUT_MS,
		});
		if (!response) {
			throw new Error("Navigation produced no response");
		}

		// Give SPAs a beat to hydrate before capturing the live body.
		await new Promise((resolve) => setTimeout(resolve, 600));

		const bodyHtml = await page.evaluate(() =>
			document.body ? document.body.innerHTML : "",
		);
		const markdown = htmlToMarkdown(bodyHtml);
		return { markdown, finalUrl: page.url() };
	});
}

/**
 * Open a fresh page with a realistic UA, resolve a value, and always release
 * the page.
 */
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		await page.setUserAgent(USER_AGENT);
		return await fn(page);
	} finally {
		await page.close().catch(() => {});
	}
}

/** Run tasks with at most `limit` concurrent executions (bounded fan-out). */
export async function mapLimit<TIn, TOut>(
	items: readonly TIn[],
	limit: number,
	fn: (item: TIn) => Promise<TOut>,
): Promise<TOut[]> {
	const results: TOut[] = new Array(items.length);
	let cursor = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (cursor < items.length) {
			const index = cursor++;
			results[index] = await fn(items[index]!);
		}
	});
	await Promise.all(workers);
	return results;
}