import type { HashlineToolEdit } from "../hashline";

export type ToolResult = {
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
	details: HashlineEditToolDetails;
};

export type EditClassification = "applied" | "noop";

export type HashlineEditToolDetails = {
	diff: string;
	/** Standard git-style unified patch; empty string for noop responses */
	patch: string;
	firstChangedLine?: number;
	classification: EditClassification;
	warnings: string[];
};

export type EditMeta = {
	firstChangedLine?: number;
	lastChangedLine?: number;
};

export type NoopEditEntry = {
	editIndex: number;
	loc: string;
	currentContent: string;
};

export interface NoopResponseInput {
	path: string;
	noopEdits: NoopEditEntry[] | undefined;
	warnings: string[] | undefined;
}

export interface SuccessResponseInput {
	/** Absolute target path (resolveToCwd output) */
	resolvedPath: string;
	/** Directory the patch path is relative to (tool cwd) */
	patchRoot: string;
	originalNormalized: string;
	result: string;
	warnings: string[] | undefined;
	editMeta: EditMeta;
}

export type EditRequestParams = {
	path: string;
	edits: HashlineToolEdit[];
};

export type EditPipelineResult = {
	path: string;
	originalNormalized: string;
	result: string;
	bom: string;
	originalEnding: "\r\n" | "\n";
	hadUtf8DecodeErrors: boolean;
	warnings: string[];
	noopEdits?: { editIndex: number; loc: string; currentContent: string }[];
	firstChangedLine?: number;
	lastChangedLine?: number;
};