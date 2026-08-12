import { describe, test, expect } from "bun:test";
import { formatHashlineReadPreview } from "./read";

describe("formatHashlineReadPreview", () => {
	test("hashline mode adds LINE#HASH anchors by default", () => {
		const preview = formatHashlineReadPreview("a\nb\nc", {});
		expect(preview.text).toContain("1#");
		expect(preview.text).toContain("2#");
		expect(preview.text).toContain("3#");
		expect(preview.text).toContain(":a");
		expect(preview.text).toContain(":c");
	});

	test("raw mode returns plain text without anchors", () => {
		const preview = formatHashlineReadPreview("a\nb\nc", { raw: true });
		expect(preview.text).toBe("a\nb\nc");
	});

	test("offset starts at the given line", () => {
		const preview = formatHashlineReadPreview("a\nb\nc", { offset: 2 });
		expect(preview.text).toContain(":b");
		expect(preview.text).not.toContain(":a");
	});

	test("offset + limit returns only the range", () => {
		const preview = formatHashlineReadPreview("a\nb\nc", {
			offset: 2,
			limit: 1,
		});
		expect(preview.text).toContain(":b");
		expect(preview.text).not.toContain(":a");
		expect(preview.text).not.toContain(":c");
	});

	test("empty file returns insert hint", () => {
		const preview = formatHashlineReadPreview("", {});
		expect(preview.text).toContain(
			"File is empty. Use edit with prepend or append and omit pos to insert content.",
		);
	});

	test("offset beyond end of file returns guidance", () => {
		const preview = formatHashlineReadPreview("a\nb", { offset: 5 });
		expect(preview.text).toContain(
			"Offset 5 is beyond end of file (2 lines total).",
		);
	});
});