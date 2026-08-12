/**
 * Consolidated hashline type surface.
 *
 * Holds the anchor/edit types shared across the hashline modules (parse,
 * apply, format) plus the internal apply-engine types, so each module imports
 * from here rather than declaring/owning overlapping shapes.
 */

export type Anchor = { line: number; hash: string; textHint?: string };
export type HashlineEdit =
	| { op: "replace"; pos: Anchor; end?: Anchor; lines: string[] }
	| { op: "append"; pos?: Anchor; lines: string[] }
	| { op: "prepend"; pos?: Anchor; lines: string[] }
	| { op: "replace_text"; oldText: string; newText: string };

export type HashlineToolEdit = {
	op: string;
	pos?: string;
	end?: string;
	lines?: string[];
	oldText?: string;
	newText?: string;
};

export interface HashMismatch {
	line: number;
	expected: string;
	actual: string;
	textHint?: string;
}

export interface NoopEdit {
	editIndex: number;
	loc: string;
	currentContent: string;
}

export type ResolvedEditSpan = {
	kind: "replace" | "insert";
	index: number;
	label: string;
	start: number;
	end: number;
	replacement: string;
	boundary?: number;
	insertMode?: "append-empty-origin" | "prepend-empty-origin";
};

export type LineIndex = {
	fileLines: string[];
	lineStarts: number[];
	hasTerminalNewline: boolean;
	/**
	 * Line count as the model sees it in read output: excludes the trailing
	 * sentinel element produced by split("\n") on a newline-terminated file.
	 */
	visibleLineCount: number;
};