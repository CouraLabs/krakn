import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { NodeExecutionEnv } from "../tool-context";
import { createReadTool } from "./read";
import { createEditTool } from "../edit/edit";
import { writeFileSync, unlinkSync, existsSync } from "fs";

const TEST_FILE = "/tmp/krakn-test.txt";
let env: NodeExecutionEnv;
let readTool: ReturnType<typeof createReadTool>;
let editTool: ReturnType<typeof createEditTool>;

beforeAll(() => {
	writeFileSync(TEST_FILE, "line one\nline two\nline three\n");
	env = new NodeExecutionEnv({ cwd: "/tmp" });
	readTool = createReadTool(env);
	editTool = createEditTool(env);
});

afterAll(() => {
	if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE);
});

function extractAnchor(content: string, line: number): string {
	// Content lines look like "  N#HASH:line" (padded line number).
	const re = new RegExp(`^\\s*${line}#([A-Z]+):`, "m");
	const match = content.match(re);
	if (!match) throw new Error(`No anchor for line ${line} in:\n${content}`);
	return `${line}#${match[1]}`;
}

describe("read -> edit -> re-read integration", () => {
	test("read returns anchored lines", async () => {
		const result = await readTool.execute("t", { path: "krakn-test.txt" }, undefined);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("1#");
		expect(text).toContain("line one");
	});

	test("edit replaces a line via its anchor", async () => {
		const readResult = await readTool.execute(
			"t",
			{ path: "krakn-test.txt" },
			undefined,
		);
		const text = readResult.content[0]?.type === "text" ? readResult.content[0].text : "";
		const anchor = extractAnchor(text, 1);

		const editResult = await editTool.execute(
			"t",
			{ path: "krakn-test.txt", edits: [{ op: "replace", pos: anchor, lines: ["REPLACED"] }] },
			undefined,
		);
		expect(editResult.details?.classification).toBe("applied");
		expect(editResult.details?.diff).toContain("-");
		expect(editResult.details?.diff).toContain("+");
	});

	test("re-read shows the change", async () => {
		const result = await readTool.execute("t", { path: "krakn-test.txt" }, undefined);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		expect(text).toContain("REPLACED");
		expect(text).not.toContain("line one");
	});

	test("edit with stale anchor throws", async () => {
		expect(
			editTool.execute(
				"t",
				{ path: "krakn-test.txt", edits: [{ op: "replace", pos: "1#ZZ", lines: ["x"] }] },
				undefined,
			),
		).rejects.toThrow(/E_STALE_ANCHOR/);
	});

	test("noop edit returns noop classification", async () => {
		const result = await readTool.execute("t", { path: "krakn-test.txt" }, undefined);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";
		const anchor = extractAnchor(text, 1);

		const editResult = await editTool.execute(
			"t",
			{ path: "krakn-test.txt", edits: [{ op: "replace", pos: anchor, lines: ["REPLACED"] }] },
			undefined,
		);
		expect(editResult.details?.classification).toBe("noop");
	});
});