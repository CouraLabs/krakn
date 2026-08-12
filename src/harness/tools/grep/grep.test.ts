import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { NodeExecutionEnv } from "../tool-context";
import { createGrepTool } from "./grep";
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } from "fs";

const TEST_DIR = "/tmp/krakn-grep-test";
let env: NodeExecutionEnv;
let grepTool: ReturnType<typeof createGrepTool>;

beforeAll(() => {
	mkdirSync(TEST_DIR, { recursive: true });
	writeFileSync(`${TEST_DIR}/a.ts`, "foo\nbar\nbaz\n");
	writeFileSync(`${TEST_DIR}/b.ts`, "foo\nqux\n");
	env = new NodeExecutionEnv({ cwd: "/tmp" });
	grepTool = createGrepTool(env);
});

afterAll(() => {
	if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("grep tool integration", () => {
	test("finds matches with hashline anchors", async () => {
		const result = await grepTool.execute(
			"t",
			{ pattern: "foo", path: TEST_DIR },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("#");
		expect(text).toContain("foo");
		expect(result.details?.matches).toBe(2);
		expect(result.details?.files).toBe(2);
	});

	test("no matches returns empty message", async () => {
		const result = await grepTool.execute(
			"t",
			{ pattern: "nonexistent", path: TEST_DIR },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toBe("No matches found for nonexistent.");
		expect(result.details?.matches).toBe(0);
		expect(result.details?.files).toBe(0);
	});

	test("limit truncates matches", async () => {
		const result = await grepTool.execute(
			"t",
			{ pattern: "foo|bar|baz|qux", path: TEST_DIR, limit: 1 },
			undefined,
		);
		expect(result.details?.truncated).toBe(true);
		expect(result.details?.matches).toBe(1);
	});

	test("context lines are included", async () => {
		const result = await grepTool.execute(
			"t",
			{ pattern: "bar", path: TEST_DIR, context: 1 },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("foo");
		expect(text).toContain("baz");
	});
});