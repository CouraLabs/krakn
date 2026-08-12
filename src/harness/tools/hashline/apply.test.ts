import { describe, test, expect } from "bun:test";
import { applyHashlineEdits } from "./apply";
import { computeLineHash } from "./hash";
import type { HashlineEdit } from "./parse";

const lineHash = (fileLines: readonly string[], idx: number): HashlineEdit["pos"] => ({
	line: idx + 1,
	hash: computeLineHash(fileLines, idx),
});

describe("applyHashlineEdits", () => {
	test("replace single line via anchor", () => {
		const file = "line one\nline two\nline three";
		const lines = file.split("\n");
		const result = applyHashlineEdits(file, [
			{ op: "replace", pos: lineHash(lines, 0), lines: ["REPLACED"] },
		]);
		expect(result.content).toBe("REPLACED\nline two\nline three");
	});

	test("span replace with pos..end merges lines", () => {
		const file = "a\nb\nc";
		const lines = file.split("\n");
		const result = applyHashlineEdits(file, [
			{
				op: "replace",
				pos: lineHash(lines, 0),
				end: lineHash(lines, 1),
				lines: ["merged"],
			},
		]);
		expect(result.content).toBe("merged\nc");
	});

	test("append after anchor inserts after that line", () => {
		const file = "a\nb\nc";
		const lines = file.split("\n");
		const result = applyHashlineEdits(file, [
			{ op: "append", pos: lineHash(lines, 1), lines: ["inserted"] },
		]);
		expect(result.content).toBe("a\nb\ninserted\nc");
	});

	test("prepend before anchor inserts before that line", () => {
		const file = "a\nb\nc";
		const lines = file.split("\n");
		const result = applyHashlineEdits(file, [
			{ op: "prepend", pos: lineHash(lines, 1), lines: ["inserted"] },
		]);
		expect(result.content).toBe("a\ninserted\nb\nc");
	});

	test("append without pos appends at EOF", () => {
		const result = applyHashlineEdits("a\nb\nc", [
			{ op: "append", lines: ["eof"] },
		]);
		expect(result.content).toBe("a\nb\nc\neof");
	});

	test("prepend without pos prepends at BOF", () => {
		const result = applyHashlineEdits("a\nb\nc", [
			{ op: "prepend", lines: ["bof"] },
		]);
		expect(result.content).toBe("bof\na\nb\nc");
	});

	test("stale anchor hash throws E_STALE_ANCHOR", () => {
		expect(() =>
			applyHashlineEdits("a\nb\nc", [
				{ op: "replace", pos: { line: 1, hash: "ZZ" }, lines: ["x"] },
			]),
		).toThrow(/E_STALE_ANCHOR/);
	});

	test("empty edits array returns content unchanged", () => {
		const result = applyHashlineEdits("a\nb", []);
		expect(result.content).toBe("a\nb");
		expect(result.firstChangedLine).toBeUndefined();
		expect(result.lastChangedLine).toBeUndefined();
	});

	test("noop edit (identical replacement) is classified as noop", () => {
		const file = "a\nb\nc";
		const lines = file.split("\n");
		const result = applyHashlineEdits(file, [
			{ op: "replace", pos: lineHash(lines, 1), lines: ["b"] },
		]);
		expect(result.content).toBe(file);
		expect(result.noopEdits).toBeDefined();
		expect(result.noopEdits!.some((e) => e.editIndex === 0)).toBe(true);
	});
});