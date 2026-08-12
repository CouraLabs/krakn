import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
	chmodSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
	normalizeToLF,
	resolveMutationTargetPath,
	stripBom,
	writeFileAtomically,
} from "./fs-write";

let dir: string;

beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), "krakn-fs-"));
});

afterAll(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("normalizeToLF", () => {
	test("converts CRLF and lone CR to LF", () => {
		expect(normalizeToLF("a\r\nb\rc\n")).toBe("a\nb\nc\n");
	});
	test("leaves LF-only text unchanged", () => {
		expect(normalizeToLF("a\nb\n")).toBe("a\nb\n");
	});
});

describe("stripBom", () => {
	test("removes a leading BOM and reports it", () => {
		expect(stripBom("\uFEFFabc")).toEqual({ bom: "\uFEFF", text: "abc" });
	});
	test("returns text unchanged when there is no BOM", () => {
		expect(stripBom("abc")).toEqual({ bom: "", text: "abc" });
	});
});

describe("writeFileAtomically", () => {
	test("writes content and creates missing parent directories", async () => {
		const target = join(dir, "nested", "deep", "a.txt");
		await writeFileAtomically(target, "hello");
		expect(readFileSync(target, "utf-8")).toBe("hello");
	});

	test("preserves the existing file mode on overwrite", async () => {
		const target = join(dir, "mode.txt");
		writeFileSync(target, "old");
		chmodSync(target, 0o600);
		await writeFileAtomically(target, "new");
		expect(readFileSync(target, "utf-8")).toBe("new");
		expect(statSync(target).mode & 0o777).toBe(0o600);
	});

	test("leaves no temp file behind", async () => {
		await writeFileAtomically(join(dir, "clean.txt"), "x");
		const leftovers = readdirSync(dir).filter((n) => n.includes(".tmp-"));
		expect(leftovers).toEqual([]);
	});
});

describe("resolveMutationTargetPath", () => {
	test("resolves a relative path against cwd to an absolute path", async () => {
		const r = await resolveMutationTargetPath(join(dir, "plain", "file.ts"));
		expect(r.startsWith("/")).toBe(true);
		expect(r).toContain(join("plain", "file.ts"));
	});

	test("keeps missing trailing parts without throwing", async () => {
		// On macOS /var is a symlink to /private/var, so the abs path normalizes,
		// but the missing tail must be preserved verbatim.
		const resolved = await resolveMutationTargetPath(join(dir, "does", "not", "exist.ts"));
		expect(resolved.endsWith(join("does", "not", "exist.ts"))).toBe(true);
	});

	test("follows symlinks to their canonical target", async () => {
		const real = join(dir, "real.txt");
		writeFileSync(real, "data");
		const link = join(dir, "link.txt");
		symlinkSync("real.txt", link);

		const resolved = await resolveMutationTargetPath(link);
		expect(resolved.endsWith("real.txt")).toBe(true);
	});
});