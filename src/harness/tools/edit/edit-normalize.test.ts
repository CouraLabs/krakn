import { describe, test, expect } from "bun:test";
import { normalizeEditRequest } from "./edit-normalize";

describe("normalizeEditRequest", () => {
	test("canonical input passes through unchanged", () => {
		const input = { path: "f.ts", edits: [{ op: "replace", pos: "1#MQ", lines: ["new"] }] };
		expect(normalizeEditRequest(input)).toEqual(input);
	});

	test("top-level oldText/newText fold into a replace_text edit", () => {
		expect(normalizeEditRequest({ path: "f.ts", oldText: "old", newText: "new" })).toEqual({
			path: "f.ts",
			edits: [{ op: "replace_text", oldText: "old", newText: "new" }],
		});
	});

	test("JSON-string edits parse into an array", () => {
		expect(
			normalizeEditRequest({
				path: "f.ts",
				edits: '[{"op":"append","lines":["x"]}]',
			}),
		).toEqual({
			path: "f.ts",
			edits: [{ op: "append", lines: ["x"] }],
		});
	});

	test("file_path alias maps to path", () => {
		expect(normalizeEditRequest({ file_path: "f.ts", edits: [] })).toEqual({
			path: "f.ts",
			edits: [],
		});
	});

	test("missing op backfills to replace_text for oldText/newText items", () => {
		expect(
			normalizeEditRequest({ path: "f.ts", edits: [{ oldText: "a", newText: "b" }] }),
		).toEqual({
			path: "f.ts",
			edits: [{ op: "replace_text", oldText: "a", newText: "b" }],
		});
	});

	test("non-object input returns unchanged", () => {
		expect(normalizeEditRequest(null)).toBeNull();
	});

	test("malformed JSON edits string stays as-is", () => {
		expect(normalizeEditRequest({ path: "f.ts", edits: "not-json" })).toEqual({
			path: "f.ts",
			edits: "not-json",
		});
	});
});