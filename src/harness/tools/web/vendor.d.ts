/**
 * Minimal ambient types for `turndown` and `@mixmark-io/domino`, neither of
 * which ships author-maintained type definitions.
 *
 * Only the surface we use is declared; the rest is intentionally absent so
 * drift surfaces as a type error rather than a silent gap.
 */

declare module "turndown" {
	type Filter = string | string[] | ((node: unknown) => boolean);

	interface TurndownOptions {
		headingStyle?: "setext" | "atx";
		hr?: string;
		bulletListMarker?: string;
		codeBlockStyle?: "indented" | "fenced";
		fence?: string;
		emDelimiter?: string;
		strongDelimiter?: string;
		linkStyle?: "inlined" | "referenced";
		linkReferenceStyle?: "full" | "collapsed" | "shortcut";
		preformattedCode?: boolean;
	}

	interface Rule {
		filter: Filter;
		replacement?: (content: string, node: unknown, options: TurndownOptions) => string;
	}

	class TurndownService {
		constructor(options?: TurndownOptions);
		/** Convert an HTML string (or DOM node) to Markdown. */
		turndown(input: string | unknown): string;
		/** Skip converting elements matched by filter (kept as raw HTML). */
		keep(filter: Filter): TurndownService;
		/** Drop elements matched by filter entirely. */
		remove(filter: Filter): TurndownService;
		/** Add or override a conversion rule. */
		addRule(key: string, rule: Rule): TurndownService;
	}

	export = TurndownService;
}

declare module "@mixmark-io/domino" {
	/**
	 * Subset of the DOM used for HTML cleaning. `createDocument` wraps a
	 * fragment/string in a full document, mirroring `DOMParser`/`document`
	 * semantics closely enough for our purposes.
	 */
	export interface DominoDocument {
		readonly body: DominoElement | null;
	}
	export interface DominoElement {
		querySelectorAll(selectors: string): DominoElement[];
		remove(): void;
		innerHTML: string;
	}
	export function createDocument(html: string): DominoDocument;
}