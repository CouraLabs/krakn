import { describe, test, expect } from "bun:test";
import {
	detectLineEnding,
	restoreLineEndings,
	hasMixedLineEndings,
	generateDiffString,
	computePatchRelativePath,
	quotePatchHeaderPath,
	generateUnifiedPatch,
} from "./edit-diff";
import { normalizeToLF, stripBom } from "../fs-write"

describe("detectLineEnding", () => {
	test("detects CRLF", () => {
		expect(detectLineEnding("a\r\nb")).toBe("\r\n");
	});

	test("detects LF", () => {
		expect(detectLineEnding("a\nb")).toBe("\n");
	});
});

describe("normalizeToLF", () => {
	test("converts CRLF to LF", () => {
		expect(normalizeToLF("a\r\nb\r\nc")).toBe("a\nb\nc");
	});

	test("converts lone CR to LF", () => {
		expect(normalizeToLF("a\rb\rc")).toBe("a\nb\nc");
	});
});

describe("restoreLineEndings", () => {
	test("converts LF to CRLF when ending is CRLF", () => {
		expect(restoreLineEndings("a\nb\n", "\r\n")).toBe("a\r\nb\r\n");
	});

	test("leaves LF when ending is LF", () => {
		expect(restoreLineEndings("a\nb", "\n")).toBe("a\nb");
	});
});

describe("hasMixedLineEndings", () => {
	test("true with CRLF + bare LF", () => {
		expect(hasMixedLineEndings("a\r\nb\nc")).toBe(true);
	});

	test("false with uniform LF", () => {
		expect(hasMixedLineEndings("a\nb\nc")).toBe(false);
	});

	test("false with uniform CRLF", () => {
		expect(hasMixedLineEndings("a\r\nb\r\nc")).toBe(false);
	});
});

describe("stripBom", () => {
	test("strips leading BOM", () => {
		expect(stripBom("\uFEFFhello")).toEqual({ bom: "\uFEFF", text: "hello" });
	});

	test("no BOM -> empty bom", () => {
		expect(stripBom("hello")).toEqual({ bom: "", text: "hello" });
	});
});

describe("generateDiffString", () => {
	test("includes removed and added lines", () => {
		const { diff } = generateDiffString("a\nb", "a\nB");
		expect(diff).toContain("-");
		expect(diff).toContain("+");
	});

	test("empty diff for identical content", () => {
		const { diff } = generateDiffString("a\nb", "a\nb");
		expect(diff).toBe("");
	});
});

describe("computePatchRelativePath", () => {
	test("computes relative path under root", () => {
		expect(computePatchRelativePath("/root/src/file.ts", "/root")).toBe(
			"src/file.ts",
		);
	});

	test("null when outside root", () => {
		expect(computePatchRelativePath("/other/file.ts", "/root")).toBeNull();
	});
});

describe("quotePatchHeaderPath", () => {
	test("plain path is not quoted", () => {
		expect(quotePatchHeaderPath("simple.ts")).toBe("simple.ts");
	});

	test("path with quotes is C-quoted", () => {
		expect(quotePatchHeaderPath('file "weird".ts')).toStartWith('"');
	});
});

describe("generateUnifiedPatch", () => {
	test("returns empty for identical content", () => {
		expect(generateUnifiedPatch("a\nb", "a\nb", "f.ts")).toBe("");
	});

	test("emits a --- / +++ patch with hunks for changed content", () => {
		const patch = generateUnifiedPatch("a\nb", "a\nB", "src/f.ts");
		expect(patch).toContain("---");
		expect(patch).toContain("+++");
		expect(patch).toContain("@@");
	});
});