import { describe, test, expect } from "bun:test";
import {
	computeLineHash,
	computeHashFromContext,
	normalizeHashInput,
	isFuzzyEquivalentLine,
	hintMatchesLine,
	hintHasSignal,
	NIBBLE_STR,
	getHashLength,
} from "./hash";

describe("computeLineHash", () => {
	test("returns a 2-char hash by default", () => {
		const h = computeLineHash(["abc", "def", "ghi"], 0);
		expect(h).toHaveLength(2);
		for (const ch of h) {
			expect(NIBBLE_STR).toContain(ch);
		}
	});

	test("is deterministic (same input -> same hash)", () => {
		const lines = ["abc", "def", "ghi"];
		expect(computeLineHash(lines, 0)).toBe(computeLineHash(lines, 0));
	});

	test("different lines produce different hashes", () => {
		const lines = ["abc", "def", "ghi"];
		expect(computeLineHash(lines, 0)).not.toBe(computeLineHash(lines, 1));
	});

	test("single-line file (no neighbors) does not throw", () => {
		const h = computeLineHash(["only"], 0);
		expect(h).toHaveLength(2);
	});

	test("hash length matches the fixed default", () => {
		computeLineHash(["a", "b", "c"], 1); // sanity: no mutation between calls
		expect(computeLineHash(["a", "b", "c"], 1)).toHaveLength(getHashLength());
		expect(getHashLength()).toBe(2);
	});
});

describe("computeHashFromContext", () => {
	test("deterministic for fixed window", () => {
		expect(computeHashFromContext("a", "b", "c")).toBe(
			computeHashFromContext("a", "b", "c"),
		);
	});
});

describe("normalizeHashInput", () => {
	test("strips CR and trimEnds", () => {
		expect(normalizeHashInput("  hello  \r")).toBe("  hello");
	});

	test("leaves leading whitespace intact", () => {
		expect(normalizeHashInput("   x")).toBe("   x");
	});
});

describe("isFuzzyEquivalentLine", () => {
	test("smart quotes normalize equal to straight quotes", () => {
		expect(isFuzzyEquivalentLine("\u201Chello\u201D", '"hello"')).toBe(true);
		expect(isFuzzyEquivalentLine("\u2018hello\u2019", "'hello'")).toBe(true);
	});

	test("different content is not equivalent", () => {
		expect(isFuzzyEquivalentLine("hello", "world")).toBe(false);
	});

	test("unicode hyphens normalize to ASCII hyphen", () => {
		expect(isFuzzyEquivalentLine("a\u2014b", "a-b")).toBe(true);
	});
});

describe("hintHasSignal", () => {
	test("ellipsis-only hint has no signal", () => {
		expect(hintHasSignal("...")).toBe(false);
		expect(hintHasSignal("\u2026")).toBe(false);
	});

	test("content-bearing hint has signal", () => {
		expect(hintHasSignal("const x")).toBe(true);
	});
});

describe("hintMatchesLine", () => {
	test("exact match returns true", () => {
		expect(hintMatchesLine("const x = 1", "const x = 1")).toBe(true);
	});

	test("ellipsis prefix matches start of line", () => {
		expect(hintMatchesLine("const x...", "const x = 1")).toBe(true);
	});

	test("non-matching content returns false", () => {
		expect(hintMatchesLine("const y", "const x = 1")).toBe(false);
	});
});