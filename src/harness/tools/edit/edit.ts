import { withFileMutationQueue } from "../file-mutation-queue";
import { Type, type Static, type TSchema } from "typebox";
import { constants } from "fs";
import { access as fsAccess } from "fs/promises";
import {
	detectLineEnding,
	generateDiffString,
	hasMixedLineEndings,
	restoreLineEndings,
} from "./edit-diff";
import { normalizeEditRequest } from "./edit-normalize";
import { normalizeToLF, resolveMutationTargetPath, stripBom, writeFileAtomically } from "../fs-write";
import {
	applyHashlineEdits,
	computeChangedLineRange,
	resolveEditAnchors,
	type HashlineToolEdit,
} from "../hashline";
import { loadFileKindAndText } from "../file-kind";
import { resolveToCwd } from "../path-utils";
import { loadPrompt } from "../prompt-loader";
import { throwIfAborted } from "../runtime";
import {
	buildChangedResponse,
	buildNoopResponse,
} from "./edit-response";
import type {
	EditMeta,
	EditPipelineResult,
	EditRequestParams,
	HashlineEditToolDetails,
} from "./edit-types";
import {
	isDuplicateAppliedPayload,
	recordAppliedEdit,
	recordNoopEdit,
} from "../noop-loop-guard";
import { getReadSnapshot, getReadSnapshotVersions, rememberReadSnapshot } from "../read-snapshot";
import { threeWayMerge } from "../merge";
import type { NodeExecutionEnv } from "../tool-context";
import type { AgentTool } from "@earendil-works/pi-agent-core";

function literalStringSchema<const Value extends string>(
	value: Value,
	options: { description: string },
) {
	return Type.Unsafe<Value>({
		type: "string",
		enum: [value],
		description: options.description,
	});
}

const hashlineEditLinesSchema = Type.Array(Type.String(), {
	description:
		"replacement content, one array entry per line, no LINE#HASH prefix",
});

const hashlineReplaceEditSchema = Type.Object(
	{
		op: literalStringSchema("replace", {
			description:
				"replace one line at pos, or an inclusive pos..end range, with lines",
		}),
		pos: Type.String({ description: "start anchor (LINE#HASH from read)" }),
		end: Type.Optional(
			Type.String({
				description:
					"inclusive end anchor (LINE#HASH) of the range to replace; omit to replace only the line at pos",
			}),
		),
		lines: hashlineEditLinesSchema,
	},
	{ additionalProperties: false },
);

const hashlineAppendEditSchema = Type.Object(
	{
		op: literalStringSchema("append", {
			description: "insert lines after pos; omit pos to append at EOF",
		}),
		pos: Type.Optional(
			Type.String({ description: "anchor (LINE#HASH from read) to insert after" }),
		),
		lines: hashlineEditLinesSchema,
	},
	{ additionalProperties: false },
);

const hashlinePrependEditSchema = Type.Object(
	{
		op: literalStringSchema("prepend", {
			description: "insert lines before pos; omit pos to prepend at BOF",
		}),
		pos: Type.Optional(
			Type.String({
				description: "anchor (LINE#HASH from read) to insert before",
			}),
		),
		lines: hashlineEditLinesSchema,
	},
	{ additionalProperties: false },
);

const hashlineReplaceTextEditSchema = Type.Object(
	{
		op: literalStringSchema("replace_text", {
			description: "replace an exact unique substring with newText",
		}),
		oldText: Type.String({
			description: "exact text to replace; must be unique in the file",
		}),
		newText: Type.String({ description: "replacement text" }),
	},
	{ additionalProperties: false },
);

// Schema including replace_text (the default / replaceText=true shape).
const hashlineEditItemSchema = Type.Union(
	[
		hashlineReplaceEditSchema,
		hashlineAppendEditSchema,
		hashlinePrependEditSchema,
		hashlineReplaceTextEditSchema,
	],
	{
		description:
			'discriminated edit item. "replace" uses pos/end/lines; "append" and "prepend" use optional pos + lines; "replace_text" uses oldText/newText.',
	},
);

// Schema with replace_text removed (replaceText=false shape).
const hashlineEditItemSchemaNoReplaceText = Type.Union(
	[
		hashlineReplaceEditSchema,
		hashlineAppendEditSchema,
		hashlinePrependEditSchema,
	],
	{
		description:
			'discriminated edit item. "replace" uses pos/end/lines; "append" and "prepend" use optional pos + lines.',
	},
);

export const hashlineEditToolSchema = Type.Object(
	{
		path: Type.String({ description: "path" }),
		edits: Type.Array(hashlineEditItemSchema, { description: "edits over $path" }),
		// Native edit dialects (top-level oldText/newText, old_text/new_text,
		// file_path alias, JSON-string edits) are folded into the canonical `edits`
		// shape by normalizeEditRequest in the prepareArguments hook, which runs
		// before this schema is validated. By the time AJV sees the request those
		// fields no longer exist, so the published schema stays minimal and the
		// model is never shown a non-hashline path. See edit-normalize.ts.
	},
	{ additionalProperties: false },
);

// Schema published to the model when replaceText=false: replace_text op is
// absent so the model never sees it as a valid option.
const hashlineEditToolSchemaNoReplaceText = Type.Object(
	{
		path: Type.String({ description: "path" }),
		edits: Type.Array(hashlineEditItemSchemaNoReplaceText, { description: "edits over $path" }),
	},
	{ additionalProperties: false },
);

const EDIT_DESC = loadPrompt(new URL("../../prompts/edit.md", import.meta.url)).trim();

const ROOT_KEYS = new Set(["path", "edits"]);
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Validates the canonical edit request envelope after normalizeEditRequest has
// converged any model dialects. Per-edit structural validation is delegated to
// resolveEditAnchors, which is the single source of truth for edit-item shape
// + op constraints. This function validates only the root-level request fields:
// path and that edits is an array.
//
// Intentional overlap with the published TypeBox schema: environments without
// runtime AJV code generation must still get semantic validation, so these
// checks are the backstop.
export function assertEditRequest(
	request: unknown,
): asserts request is EditRequestParams {
	if (!isRecord(request)) {
		throw new Error("Edit request must be an object.");
	}

	const unknownRootKeys = Object.keys(request).filter(
		(key) => !ROOT_KEYS.has(key),
	);
	if (unknownRootKeys.length > 0) {
		throw new Error(
			`Edit request contains unknown or unsupported fields: ${unknownRootKeys.join(", ")}.`,
		);
	}

	if (typeof request.path !== "string" || request.path.length === 0) {
		throw new Error('Edit request requires a non-empty "path" string.');
	}

	if (!Array.isArray(request.edits)) {
		throw new Error('Edit request requires an "edits" array.');
	}

	// Per-edit validation lives in resolveEditAnchors — the single source of
	// truth for edit-item shape, op constraints, and anchor parsing.
}

/**
 * Shared edit pipeline: read file, resolve anchors, and apply edits. Public
 * entrypoints normalize + validate before calling this; access mode controls
 * whether the file must be writable.
 */
async function executeEditPipeline(
	params: EditRequestParams,
	cwd: string,
	accessMode: number,
	signal?: AbortSignal,
	resolvedPath?: string,
): Promise<EditPipelineResult> {
	const path = params.path;
	const absolutePath = resolvedPath ?? resolveToCwd(path, cwd);
	const toolEdits = params.edits;

	if (toolEdits.length === 0) {
		throw new Error("No edits provided.");
	}

	throwIfAborted(signal);
	try {
		await fsAccess(absolutePath, accessMode);
	} catch (error: unknown) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			throw new Error(`File not found: ${path}. Use the write tool to create new files.`);
		}
		if (code === "EACCES" || code === "EPERM") {
			const accessLabel =
				accessMode & constants.W_OK ? "not writable" : "not readable";
			throw new Error(`File is ${accessLabel}: ${path}`);
		}
		throw new Error(`Cannot access file: ${path}`);
	}

	throwIfAborted(signal);
	const file = await loadFileKindAndText(absolutePath);
	if (file.kind === "directory") {
		throw new Error(
			`Path is a directory: ${path}. Use ls to inspect directories.`,
		);
	}
	if (file.kind === "image") {
		throw new Error(
			`Path is an image file: ${path}. Hashline edit only supports text files.`,
		);
	}
	if (file.kind === "binary") {
		throw new Error(
			`Path is a binary file: ${path} (${file.description}). Hashline edit only supports text files.`,
		);
	}

	throwIfAborted(signal);
	const { bom, text: rawContent } = stripBom(file.text);
	const originalEnding = detectLineEnding(rawContent);
	const mixedEndingWarning = hasMixedLineEndings(rawContent)
		? `File had mixed line endings (CRLF and LF); this edit rewrote it uniformly as ${originalEnding === "\r\n" ? "CRLF" : "LF"}.`
		: undefined;
	const originalNormalized = normalizeToLF(rawContent);

	const resolved = resolveEditAnchors(toolEdits);

	const extraWarnings: string[] = [];

	// Both the direct-apply and snapshot-recovery paths return the same shape,
	// differing only in the applied content, its per-result warnings, and the
	// changed-line range. Build the common envelope once.
	const buildResult = (parts: {
		result: string;
		resultWarnings?: string[];
		noopEdits?: EditPipelineResult["noopEdits"];
		firstChangedLine?: number;
		lastChangedLine?: number;
	}): EditPipelineResult => ({
		path,
		originalNormalized,
		result: parts.result,
		bom,
		originalEnding,
		hadUtf8DecodeErrors: file.hadUtf8DecodeErrors === true,
		warnings: [
			...(mixedEndingWarning ? [mixedEndingWarning] : []),
			...extraWarnings,
			...(parts.resultWarnings ?? []),
		],
		noopEdits: parts.noopEdits,
		firstChangedLine: parts.firstChangedLine,
		lastChangedLine: parts.lastChangedLine,
	});

	// Attempt to apply the edits directly. On E_STALE_ANCHOR, fall through to
	// the multi-version snapshot recovery block below.
	let directResult: ReturnType<typeof applyHashlineEdits> | null = null;
	let primaryError: unknown = null;

	try {
		directResult = applyHashlineEdits(originalNormalized, resolved, signal);
	} catch (err: unknown) {
		primaryError = err;
	}

	if (primaryError !== null) {
		// Only attempt snapshot recovery for stale-anchor errors.
		const isStale =
			primaryError instanceof Error &&
			primaryError.message.startsWith("[E_STALE_ANCHOR]");

		if (!isStale || !absolutePath) {
			throw primaryError;
		}

		// absolutePath is the canonical mutation-target path when resolvedPath was
		// provided (execute path); fall back gracefully when not (preview path).
		const canonicalPath = absolutePath;

		// Try each stored version (newest first), skipping any that matches the
		// live content (those would give a trivially identical replay and cannot
		// help). Track whether any version had valid anchors but a merge conflict,
		// for a more informative error if all versions fail.
		const versions = getReadSnapshotVersions(canonicalPath).filter(
			(v) => v !== originalNormalized,
		);

		if (versions.length === 0) {
			// No usable snapshot history: surface original error unchanged.
			throw primaryError;
		}

		let anyAnchorValid = false;

		for (const snapshot of versions) {
			// Try replaying the edits against this historical snapshot.
			let snapshotResult: ReturnType<typeof applyHashlineEdits>;
			try {
				snapshotResult = applyHashlineEdits(snapshot, resolved, signal);
			} catch {
				// Anchors not valid against this version — try older ones.
				continue;
			}

			anyAnchorValid = true;

			// 3-way merge: base=snapshot, base-edited=snapshotResult, current=live.
			const merged = threeWayMerge(snapshot, snapshotResult.content, originalNormalized);
			if (merged === null) {
				// Merge conflict for this version — try older ones.
				continue;
			}

			// Recompute changed-line range against the live file.
			const mergedRange = computeChangedLineRange(originalNormalized, merged);

			extraWarnings.push(
				"Recovered stale anchors by replaying this edit against a recent read of this file and merging onto the current content (exact merge, no relocation). Review the diff to confirm the result.",
			);

			// Recovery succeeded: return the merged result.
			return buildResult({
				result: merged,
				resultWarnings: snapshotResult.warnings,
				noopEdits: snapshotResult.noopEdits,
				firstChangedLine: mergedRange?.firstChangedLine,
				lastChangedLine: mergedRange?.lastChangedLine,
			});
		}

		// All versions exhausted without a successful merge.
		// Append a diagnostic suffix to the original error for easier triage.
		let suffix: string;
		if (anyAnchorValid) {
			suffix =
				"\n(Recovery attempted: your anchors match an older read of this file, but replaying that edit conflicts with changes made since. Re-read to get current anchors.)";
		} else {
			suffix =
				"\n(Your anchors do not match any recent read of this file — they may be from a stale context or copied incorrectly. Re-read before editing.)";
		}
		throw new Error(`${(primaryError as Error).message}${suffix}`);
	}

	// Direct apply succeeded.
	const anchorResult = directResult!;
	return buildResult({
		result: anchorResult.content,
		resultWarnings: anchorResult.warnings,
		noopEdits: anchorResult.noopEdits,
		firstChangedLine: anchorResult.firstChangedLine,
		lastChangedLine: anchorResult.lastChangedLine,
	});
}

export async function computeEditPreview(
	request: unknown,
	cwd: string,
): Promise<{ diff: string } | { error: string }> {
	try {
		const normalized = normalizeEditRequest(request);
		assertEditRequest(normalized);
		const { path, originalNormalized, result } = await executeEditPipeline(
			normalized,
			cwd,
			constants.R_OK,
		);

		if (originalNormalized === result) {
			return {
				error: `No changes made to ${path}. The edits produced identical content.`,
			};
		}

		return { diff: generateDiffString(originalNormalized, result).diff };
	} catch (error: unknown) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * Teaching error thrown when a replace_text edit arrives but replaceText is
 * disabled in config. Fires after normalization so legacy top-level
 * oldText/newText payloads (which normalize to op:"replace_text") also hit
 * this path instead of a generic schema error.
 */
function assertReplaceTextNotDisabled(edits: HashlineToolEdit[]): void {
	const hasReplaceText = edits.some((e) => e.op === "replace_text");
	if (!hasReplaceText) {
		return;
	}
	throw new Error(
		`[E_REPLACE_TEXT_DISABLED] The replace_text op is disabled in your hashline configuration (replaceText: false). ` +
		`Re-read the file to get current LINE#HASH anchors, then rewrite this edit using the "replace", "append", or "prepend" ops with those anchors instead.`,
	);
}

export function createEditTool(
	env: NodeExecutionEnv,
): AgentTool<TSchema, HashlineEditToolDetails | undefined> {
	const replaceTextEnabled = true;
	const parameters = replaceTextEnabled
		? hashlineEditToolSchema
		: hashlineEditToolSchemaNoReplaceText;

	return {
		name: "edit",
		label: "Edit",
		description: EDIT_DESC,
		parameters,

		async execute(_toolCallId, params, signal?, _onUpdate?) {
			// normalizeEditRequest is re-applied here so execute does not depend on
			// any calling-code normalization having run. Idempotent on canonical input.
			const normalized = normalizeEditRequest(params);
			assertEditRequest(normalized);
			if (!replaceTextEnabled) {
				assertReplaceTextNotDisabled(normalized.edits);
			}
			const normalizedParams = normalized;
			const path = normalizedParams.path;
			const absolutePath = resolveToCwd(path, env.cwd);
			const mutationTargetPath = await resolveMutationTargetPath(absolutePath);
			return withFileMutationQueue(env, mutationTargetPath, async () => {
				throwIfAborted(signal);

				// Duplicate-edit guard: if the incoming payload is byte-identical to the
				// last successfully applied payload for this path, and the file has not
				// changed since that edit (read-snapshot still matches current content),
				// reject before running the pipeline — the pipeline would otherwise throw
				// E_STALE_ANCHOR before we could detect the duplicate.
				const appliedPayloadKey = JSON.stringify(normalizedParams.edits);
				if (isDuplicateAppliedPayload(mutationTargetPath, appliedPayloadKey)) {
					const snapshot = getReadSnapshot(mutationTargetPath);
					if (snapshot !== null) {
						const currentFile = await loadFileKindAndText(mutationTargetPath);
						if (currentFile.kind === "text") {
							const currentNormalized = normalizeToLF(stripBom(currentFile.text).text);
							if (snapshot === currentNormalized) {
								throw new Error(
									`[E_DUPLICATE_EDIT] This exact edit was already applied to ${path} by your previous edit call — the file already contains this change. Do NOT resend the same payload: that would duplicate the inserted lines. Re-read the file to see the current state before editing again.`,
								);
							}
						}
					}
				}

				const {
					originalNormalized,
					result,
					bom,
					originalEnding,
					hadUtf8DecodeErrors,
					warnings,
					noopEdits,
					firstChangedLine,
					lastChangedLine,
				} = await executeEditPipeline(
					normalizedParams,
					env.cwd,
					constants.R_OK | constants.W_OK,
					signal,
					mutationTargetPath,
				);

				if (originalNormalized === result) {
					const { count, escalate } = recordNoopEdit(
						mutationTargetPath,
						appliedPayloadKey,
					);
					if (escalate) {
						throw new Error(
							`[E_NOOP_LOOP] Edit to ${path} was a byte-identical no-op ${count} times in a row. STOP re-sending this payload. Re-read the file — the content you are trying to write already exists, or your anchors point at the wrong lines.`,
						);
					}
					return buildNoopResponse({
						path,
						noopEdits,
						warnings,
					});
				}

				if (hadUtf8DecodeErrors) {
					warnings.push(
						"Non-UTF-8 bytes were shown as U+FFFD; this edit rewrote the file as UTF-8.",
					);
				}

				throwIfAborted(signal);
				await writeFileAtomically(
					mutationTargetPath,
					bom + restoreLineEndings(result, originalEnding),
					{ alreadyResolved: true },
				);
				recordAppliedEdit(mutationTargetPath, appliedPayloadKey);

				// Update the snapshot slot with the post-edit content so chained edits
				// using anchors from this edit's response can recover if a distant
				// external change arrives between this edit and the next one.
				rememberReadSnapshot(mutationTargetPath, result);

				const editMeta: EditMeta = {
					firstChangedLine,
					lastChangedLine,
				};

				// Canonicalize the patch root through the same symlink resolution as the
				// mutation target: when the cwd itself is a symlink (linked workspace,
				// checkout, or mount), an unresolved patchRoot would make every in-cwd
				// target look like a `..` escape and yield an empty patch. Falls back to
				// the raw cwd only if resolution fails (pathological cwd).
				let resolvedPatchRoot = env.cwd;
				try {
					resolvedPatchRoot = await resolveMutationTargetPath(env.cwd);
				} catch {
					// Keep the raw cwd; patch generation degrades gracefully.
				}

				return buildChangedResponse({
					// The patch must describe the file actually written (mutation target),
					// not the request path: for symlinks git apply refuses content hunks
					// against the link itself, and a link pointing outside the cwd would
					// otherwise yield a deceptively safe-looking cwd-relative header.
					resolvedPath: mutationTargetPath,
					patchRoot: resolvedPatchRoot,
					originalNormalized,
					result,
					warnings,
					editMeta,
				});
			});
		},
	};
}