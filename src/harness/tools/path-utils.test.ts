import { describe, expect, test } from "bun:test";
import { homedir } from "os";
import { normalizeToolPath, resolveToCwd, resolveToolPath } from "./path-utils";
import type { ExecutionEnv } from "@earendil-works/pi-agent-core";

describe("resolveToCwd", () => {
	const cwd = "/repo/src";

	test("passes absolute paths through unchanged", () => {
		expect(resolveToCwd("/etc/hosts", cwd)).toBe("/etc/hosts");
	});

	test("resolves relative paths against cwd", () => {
		expect(resolveToCwd("a/b.ts", cwd)).toBe("/repo/src/a/b.ts");
		expect(resolveToCwd("./a/b.ts", cwd)).toBe("/repo/src/a/b.ts");
	});

	test("expands ~ and ~/ prefixes to the home directory", () => {
		expect(resolveToCwd("~", cwd)).toBe(homedir());
		expect(resolveToCwd("~/docs/notes.md", cwd)).toBe(`${homedir()}/docs/notes.md`);
	});
});

describe("normalizeToolPath", () => {
	test("collapses unicode whitespace to a regular space", () => {
		expect(normalizeToolPath("a\u00A0b")).toBe("a b"); // NBSP
		expect(normalizeToolPath("x\u2003y")).toBe("x y"); // EM SPACE
		expect(normalizeToolPath("p\u202Fq")).toBe("p q"); // NARROW NBSP
	});

	test("strips a leading @ marker used to reference dynamic values", () => {
		expect(normalizeToolPath("@src/index.ts")).toBe("src/index.ts");
		expect(normalizeToolPath("@/root")).toBe("/root");
	});

	test("leaves ordinary paths untouched", () => {
		expect(normalizeToolPath("a b.ts")).toBe("a b.ts");
	});
});

describe("resolveToolPath", () => {
	const env = {
		absolutePath: async (p: string) => ({ ok: true as const, value: `/abs/${p}` }),
	} as unknown as ExecutionEnv;

	test("returns the environment-resolved absolute path", async () => {
		expect(await resolveToolPath(env, "foo/bar.ts")).toBe("/abs/foo/bar.ts");
	});

	test("normalizes the path before resolving", async () => {
		expect(await resolveToolPath(env, "@x\u00A0y")).toBe("/abs/x y");
	});

	test("propagates the env error via getOrThrow", async () => {
		const badEnv = {
			absolutePath: async () => ({ ok: false as const, error: new Error("boom") }),
		} as unknown as ExecutionEnv;
		expect(resolveToolPath(badEnv, "x")).rejects.toThrow("boom");
	});
});