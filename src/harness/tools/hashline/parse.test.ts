import { describe, test, expect } from "bun:test";
import { resolveEditAnchors, getHashlineBarePrefixRe } from "./parse";

// Default hash length is 2, so 2-char anchors like "5#MQ" are valid.

describe("resolveEditAnchors", () => {
	test("resolves a replace pos string to a typed anchor", () => {
		const resolved = resolveEditAnchors([
			{ op: "replace", pos: "5#MQ", lines: ["new"] },
		]);
		expect(resolved).toEqual([
			{ op: "replace", pos: { line: 5, hash: "MQ" }, lines: ["new"] },
		]);
	});

	test("append without pos -> undefined pos (EOF)", () => {
		const resolved = resolveEditAnchors([{ op: "append", lines: ["new"] }]);
		expect(resolved).toEqual([{ op: "append", lines: ["new"] }]);
		expect((resolved[0] as { pos?: unknown }).pos).toBeUndefined();
	});

	test("prepend without pos -> undefined pos (BOF)", () => {
		const resolved = resolveEditAnchors([{ op: "prepend", lines: ["new"] }]);
		expect(resolved).toEqual([{ op: "prepend", lines: ["new"] }]);
		expect((resolved[0] as { pos?: unknown }).pos).toBeUndefined();
	});

	test("replace_text passes through oldText/newText", () => {
		const resolved = resolveEditAnchors([
			{ op: "replace_text", oldText: "old", newText: "new" },
		]);
		expect(resolved).toEqual([
			{ op: "replace_text", oldText: "old", newText: "new" },
		]);
	});

	test("empty replace pos string throws", () => {
		expect(() =>
			resolveEditAnchors([{ op: "replace", pos: "", lines: [] }]),
		).toThrow();
	});

	test("unknown op throws", () => {
		expect(() =>
			resolveEditAnchors([{ op: "unknown" as string, lines: [] }]),
		).toThrow();
	});

	test("replace without pos throws", () => {
		expect(() => resolveEditAnchors([{ op: "replace", lines: ["x"] }])).toThrow(
			/E_BAD_OP/,
		);
	});

	test("preserves textHint from trailing :content display suffix", () => {
		const resolved = resolveEditAnchors([
			{ op: "replace", pos: "5#MQ:const x = 1", lines: ["new"] },
		]);
		expect(resolved).toEqual([
			{
				op: "replace",
				pos: { line: 5, hash: "MQ", textHint: "const x = 1" },
				lines: ["new"],
			},
		]);
	});
});

describe("getHashlineBarePrefixRe", () => {
	test("matches a bare 2-char hash prefix", () => {
		expect(getHashlineBarePrefixRe().test("MQ:")).toBe(true);
		expect(getHashlineBarePrefixRe().test("TJ: key")).toBe(true);
	});

	test("rejects a non-hash-length-alphabet sequence", () => {
		expect(getHashlineBarePrefixRe().test("xx:")).toBe(false);
	});

	test("rejects non-bare-prefix content", () => {
		expect(getHashlineBarePrefixRe().test("MQ value")).toBe(false);
	});
});