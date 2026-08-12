import { describe, test, expect } from "bun:test";
import {
	formatHashlineRegion,
	computeAffectedLineRange,
	computeChangedLineRange,
} from "./format";

describe("formatHashlineRegion", () => {
	test("renders each line with LINE#HASH prefix", () => {
		const out = formatHashlineRegion(["a", "b", "c"], 1, 3);
		expect(out).toContain("1#");
		expect(out).toContain("2#");
		expect(out).toContain("3#");
		expect(out).toContain(":a");
		expect(out).toContain(":b");
		expect(out).toContain(":c");
	});

	test("single line range", () => {
		const out = formatHashlineRegion(["a"], 1, 1);
		expect(out).toContain("1#");
		expect(out).toContain(":a");
	});
});

describe("computeAffectedLineRange", () => {
	test("adds 2 context lines on each side", () => {
		expect(
			computeAffectedLineRange({
				firstChangedLine: 3,
				lastChangedLine: 5,
				resultLineCount: 10,
			}),
		).toEqual({ start: 1, end: 7 });
	});

	test("clamps to file bounds", () => {
		expect(
			computeAffectedLineRange({
				firstChangedLine: 1,
				lastChangedLine: 1,
				resultLineCount: 1,
			}),
		).toEqual({ start: 1, end: 1 });
	});

	test("returns null when no change info present", () => {
		expect(
			computeAffectedLineRange({
				firstChangedLine: undefined,
				lastChangedLine: undefined,
				resultLineCount: 10,
			}),
		).toBeNull();
	});

	test("returns null when the range exceeds the output budget", () => {
		expect(
			computeAffectedLineRange({
				firstChangedLine: 1,
				lastChangedLine: 20,
				resultLineCount: 20,
			}),
		).toBeNull();
	});
});

describe("computeChangedLineRange", () => {
	test("detects single changed line", () => {
		expect(computeChangedLineRange("a\nb\nc", "a\nB\nc")).toEqual({
			firstChangedLine: 2,
			lastChangedLine: 2,
		});
	});

	test("returns null for identical content", () => {
		expect(computeChangedLineRange("a\nb", "a\nb")).toBeNull();
	});
});