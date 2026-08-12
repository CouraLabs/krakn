import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadFileKindAndText } from "./file-kind";

let dir: string;

// 1x1 transparent PNG (valid signature, detected as image/png).
const PNG_1x1 = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	"base64",
);

beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), "krakn-filekind-"));
	mkdirSync(join(dir, "sub"));
	// A UTF-8 text file.
	writeFileSync(join(dir, "hello.txt"), "line one\nline two\n");
	// A file that spans multiple 8 KiB read chunks.
	writeFileSync(join(dir, "big.txt"), "x".repeat(20_000));
	// Embedded null byte terminates text-as-binary semantics.
	writeFileSync(join(dir, "nulls.bin"), Buffer.from([0x68, 0x69, 0x00, 0x21]));
	// Invalid UTF-8 (truncated 2-byte sequence) should still read as lossy text.
	writeFileSync(join(dir, "latin.txt"), Buffer.from([0x68, 0x69, 0xc3, 0x28, 0x0a]));
	// A real PNG.
	writeFileSync(join(dir, "img.png"), PNG_1x1);
	// A PDF (detected binary, non-image).
	writeFileSync(join(dir, "doc.pdf"), Buffer.from("%PDF-1.4\n%fake-pdf\n"));
});

afterAll(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("loadFileKindAndText", () => {
	test("classifies a directory", async () => {
		expect(await loadFileKindAndText(join(dir, "sub"))).toEqual({ kind: "directory" });
	});

	test("classifies an empty file as empty text", async () => {
		writeFileSync(join(dir, "empty.txt"), "");
		expect(await loadFileKindAndText(join(dir, "empty.txt"))).toEqual({ kind: "text", text: "" });
	});

	test("reads a UTF-8 text file without decode errors", async () => {
		const result = await loadFileKindAndText(join(dir, "hello.txt"));
		expect(result.kind).toBe("text");
		if (result.kind === "text") {
			expect(result.text).toBe("line one\nline two\n");
			expect(result.hadUtf8DecodeErrors).toBeUndefined();
		}
	});

	test("reads a file spanning multiple chunks fully", async () => {
		const result = await loadFileKindAndText(join(dir, "big.txt"));
		expect(result.kind).toBe("text");
		if (result.kind === "text") {
			expect(result.text.length).toBe(20_000);
		}
	});

	test("flags text with invalid UTF-8 as lossy-decoded", async () => {
		const result = await loadFileKindAndText(join(dir, "latin.txt"));
		expect(result.kind).toBe("text");
		if (result.kind === "text") {
			expect(result.hadUtf8DecodeErrors).toBe(true);
			// The invalid byte becomes U+FFFD.
			expect(result.text).toContain("\uFFFD");
		}
	});

	test("classifies a file with a null byte as binary", async () => {
		const result = await loadFileKindAndText(join(dir, "nulls.bin"));
		expect(result).toEqual({ kind: "binary", description: "null bytes detected" });
	});

	test("classifies a PNG as an image with its mime type", async () => {
		const result = await loadFileKindAndText(join(dir, "img.png"));
		expect(result).toEqual({ kind: "image", mimeType: "image/png" });
	});

	test("classifies a detected binary (non-image) by mime description", async () => {
		const result = await loadFileKindAndText(join(dir, "doc.pdf"));
		expect(result).toEqual({ kind: "binary", description: "application/pdf" });
	});
});