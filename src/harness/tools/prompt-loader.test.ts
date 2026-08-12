import { describe, expect, test } from "bun:test";
import {
	buildToolGuidelines,
	loadToolGuidelines,
	rewriteAnchorExamples,
	stripReplaceTextFromPrompt,
} from "./prompt-loader";

describe("rewriteAnchorExamples", () => {
	test("is identity for len 2 (the default hash length)", () => {
		expect(rewriteAnchorExamples("12#ZP 34#QV", 2)).toBe("12#ZP 34#QV");
	});

	test("pads 2-char hashes to len 3 with Q", () => {
		expect(rewriteAnchorExamples("12#ZP", 3)).toBe("12#ZPQ");
	});

	test("pads 2-char hashes to len 4 with QV", () => {
		expect(rewriteAnchorExamples("12#ZP 34#QV", 4)).toBe("12#ZPQV 34#QVQV");
	});

	test("does not pad non-anchor sequences", () => {
		// Only <digits>#<2 hash-alphabet chars> at a word boundary is rewritten.
		expect(rewriteAnchorExamples("line #18#ZP and #no digits and 5#not-hashchars", 4)).toBe(
			"line #18#ZPQV and #no digits and 5#not-hashchars",
		);
	});
});

describe("stripReplaceTextFromPrompt", () => {
	test("removes the replace_text op bullet and its trailing newline", () => {
		const input = "some text\n- `replace_text` — { \"op\": \"replace_text\", ... }\nafter\n";
		expect(stripReplaceTextFromPrompt(input)).toBe("some text\nafter\n");
	});

	test("returns content unchanged when there is no replace_text bullet", () => {
		const input = "- `replace` — { \"op\": \"replace\", ... }\nkeep";
		expect(stripReplaceTextFromPrompt(input)).toBe(input);
	});
});

describe("loadToolGuidelines", () => {
	test("loads bullets from a real guideline file, stripping the '- ' prefix", () => {
		const lines = loadToolGuidelines("read");
		expect(lines.length).toBeGreaterThan(0);
		for (const line of lines) {
			expect(line.trim().startsWith("- ")).toBe(false);
		}
	});

	test("returns an empty array for a missing guideline file", () => {
		expect(loadToolGuidelines("does-not-exist")).toEqual([]);
	});
});

describe("buildToolGuidelines", () => {
	test("returns an empty string when no tool contributes guidelines", () => {
		expect(buildToolGuidelines(["does-not-exist-1", "does-not-exist-2"])).toBe("");
	});

	test("assembles a titled, bulleted block for known tools", () => {
		const block = buildToolGuidelines(["read"]);
		expect(block.startsWith("# Tool guidelines\n\n")).toBe(true);
		expect(block).toContain("\nread\n");
		expect(block).toContain("\n- ");
	});
});