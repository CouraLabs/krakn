import { describe, expect, test } from "bun:test";
import { threeWayMerge } from "./merge";

describe("threeWayMerge", () => {
	test("short-circuits to baseEdited when base equals current", () => {
		expect(threeWayMerge("a\nb\nc\n", "a\nB\nc\n", "a\nb\nc\n")).toBe("a\nB\nc\n");
	});

	test("carries the edit from base->baseEdited onto an unrelated change in current", () => {
		const base = "alpha\nbeta\ngamma\n";
		const baseEdited = "alpha\nBETA\ngamma\n";
		// current diverged elsewhere (appended a line), so the whole file differs
		// from base, but the changed region still matches.
		const current = "alpha\nbeta\ngamma\ndelta\n";
		const merged = threeWayMerge(base, baseEdited, current);
		expect(merged).not.toBeNull();
		expect(merged!).toContain("BETA");
		expect(merged!).toContain("delta");
		// Original unchanged region should be preserved from current.
		expect(merged!).toContain("gamma");
	});

	test("returns null when the patch cannot apply with fuzzFactor 0", () => {
		const base = "alpha\nbeta\ngamma\n";
		const baseEdited = "alpha\nBETA\ngamma\n";
		const current = "totally\ndifferent\ncontent\n";
		expect(threeWayMerge(base, baseEdited, current)).toBeNull();
	});

	test("returns null when the merge result is identical to current (nothing new)", () => {
		// base != current, but baseEdited's change is already present in current,
		// so applying the patch yields exactly current again.
		const base = "a\nb\nc\n";
		const baseEdited = "a\nX\nc\n";
		const current = "a\nX\nc\n";
		expect(threeWayMerge(base, baseEdited, current)).toBeNull();
	});
});