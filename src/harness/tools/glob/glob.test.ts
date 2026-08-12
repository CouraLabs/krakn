import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { NodeExecutionEnv } from "../tool-context";
import { createGlobTool } from "./glob";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

const TEST_DIR = "/tmp/krakn-glob-test";
let env: NodeExecutionEnv;
let tool: ReturnType<typeof createGlobTool>;

beforeAll(() => {
	rmSync(TEST_DIR, { recursive: true, force: true });
	mkdirSync(`${TEST_DIR}/src/components`, { recursive: true });
	mkdirSync(`${TEST_DIR}/src/utils`, { recursive: true });
	writeFileSync(`${TEST_DIR}/src/index.ts`, "export {};\n");
	writeFileSync(`${TEST_DIR}/src/components/Button.tsx`, "export {};\n");
	writeFileSync(`${TEST_DIR}/src/utils/helpers.ts`, "export {};\n");
	writeFileSync(`${TEST_DIR}/.hidden`, "x\n");
	env = new NodeExecutionEnv({ cwd: TEST_DIR });
	tool = createGlobTool(env);
});

afterAll(() => {
	if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("glob tool", () => {
	test("matches files by extension", async () => {
		const result = await tool.execute(
			"t",
			{ pattern: "src/**/*.ts" },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("src/index.ts");
		expect(text).toContain("src/utils/helpers.ts");
		expect(result.details?.total).toBe(2);
	});

	test("matches multiple extensions", async () => {
		const result = await tool.execute(
			"t",
			{ pattern: "src/**/*.{ts,tsx}" },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("src/components/Button.tsx");
		expect(result.details?.total).toBe(3);
	});

	test("excludes dotfiles by default", async () => {
		const result = await tool.execute("t", { pattern: "**/*" }, undefined);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).not.toContain(".hidden");
	});

	test("dot true includes dotfiles", async () => {
		const result = await tool.execute("t", { pattern: "**/*", dot: true }, undefined);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain(".hidden");
	});

	test("onlyDirectories returns just directories", async () => {
		const result = await tool.execute(
			"t",
			{ pattern: "src/**", onlyDirectories: true },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).not.toContain(".ts");
		expect(text).toContain("src/components");
		expect(text).toContain("src/utils");
	});

	test("no matches returns message", async () => {
		const result = await tool.execute("t", { pattern: "**/*.md" }, undefined);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("No matches found");
		expect(result.details?.total).toBe(0);
	});

	test("absolute true returns absolute paths", async () => {
		const result = await tool.execute(
			"t",
			{ pattern: "src/index.ts", absolute: true },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain(TEST_DIR + "/src/index.ts");
	});

	test("limit truncates results", async () => {
		const result = await tool.execute(
			"t",
			{ pattern: "src/**/*", limit: 1 },
			undefined,
		);
		expect(result.details?.truncated).toBe(true);
		expect(result.details?.matched).toBe(1);
	});

	test("array pattern unions matches", async () => {
		const result = await tool.execute(
			"t",
			{ pattern: ["src/components/**", "src/index.ts"] },
			undefined,
		);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("src/components/Button.tsx");
		expect(text).toContain("src/index.ts");
	});
});