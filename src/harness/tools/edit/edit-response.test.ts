import { describe, test, expect } from "bun:test";
import { buildNoopResponse, buildChangedResponse } from "./edit-response";

describe("buildNoopResponse", () => {
	test("basic noop response without noopEdits", () => {
		const result = buildNoopResponse({ path: "f.ts", noopEdits: undefined, warnings: [] });
		expect(result.content[0].text).toStartWith("No changes made to f.ts");
		expect(result.details.classification).toBe("noop");
		expect(result.details.diff).toBe("");
		expect(result.details.patch).toBe("");
	});

	test("noop response with detailed noop edits", () => {
		const result = buildNoopResponse({
			path: "f.ts",
			noopEdits: [{ editIndex: 0, loc: "1#MQ", currentContent: "old" }],
			warnings: [],
		});
		expect(result.content[0].text).toContain(
			"Edit 0: replacement for 1#MQ is identical to current content",
		);
	});
});

describe("buildChangedResponse", () => {
	test("applied response includes diff, patch, and anchors block", () => {
		const result = buildChangedResponse({
			resolvedPath: "/root/f.ts",
			patchRoot: "/root",
			originalNormalized: "a\nb",
			result: "a\nB",
			warnings: [],
			editMeta: { firstChangedLine: 2, lastChangedLine: 2 },
		});
		expect(result.details.classification).toBe("applied");
		expect(result.details.diff).toContain("-");
		expect(result.details.diff).toContain("+");
		expect(result.details.patch).toContain("--- a/f.ts");
		expect(result.details.patch).toContain("+++ b/f.ts");
		expect(result.content[0].text).toContain("--- Anchors");
	});

	test("patch is empty when target outside patchRoot", () => {
		const result = buildChangedResponse({
			resolvedPath: "/other/f.ts",
			patchRoot: "/root",
			originalNormalized: "a\nb",
			result: "a\nB",
			warnings: [],
			editMeta: { firstChangedLine: 2, lastChangedLine: 2 },
		});
		expect(result.details.patch).toBe("");
	});

	test("anchors omitted when change range is unbounded", () => {
		const result = buildChangedResponse({
			resolvedPath: "/root/f.ts",
			patchRoot: "/root",
			originalNormalized: "a\nb",
			result: "a\nB",
			warnings: [],
			editMeta: { firstChangedLine: undefined, lastChangedLine: undefined },
		});
		expect(result.content[0].text).toContain("Anchors omitted");
	});
});