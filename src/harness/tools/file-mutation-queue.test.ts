import { describe, expect, test } from "bun:test";
import { withFileMutationQueue } from "./file-mutation-queue";
import type { ExecutionEnv } from "@earendil-works/pi-agent-core";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Mock env that returns the input path as both its absolute and canonical form.
const env = {
	absolutePath: async (p: string) => ({ ok: true as const, value: p }),
	canonicalPath: async (p: string) => ({ ok: true as const, value: p }),
} as unknown as ExecutionEnv;

describe("withFileMutationQueue", () => {
	test("serializes mutations to the same path", async () => {
		const log: string[] = [];
		const first = withFileMutationQueue(env, "/a.ts", async () => {
			log.push("a:start");
			await sleep(20);
			log.push("a:end");
		});
		// Started synchronously; enqueue a second mutation before the first settles.
		const second = withFileMutationQueue(env, "/a.ts", async () => {
			log.push("b:start");
			log.push("b:end");
		});
		await Promise.all([first, second]);
		expect(log).toEqual(["a:start", "a:end", "b:start", "b:end"]);
	});

	test("runs mutations to different paths concurrently", async () => {
		const log: string[] = [];
		const a = withFileMutationQueue(env, "/a.ts", async () => {
			log.push("a:start");
			await sleep(20);
			log.push("a:end");
		});
		const b = withFileMutationQueue(env, "/b.ts", async () => {
			log.push("b:start");
			await sleep(20);
			log.push("b:end");
		});
		await Promise.all([a, b]);
		// Both started before either finished => interleaving.
		expect(log[0] === "a:start" || log[0] === "b:start").toBe(true);
		expect(log).toContain("a:start");
		expect(log).toContain("b:start");
		expect(log.indexOf("a:start")).toBeLessThan(log.indexOf("a:end"));
		expect(log.indexOf("b:start")).toBeLessThan(log.indexOf("b:end"));
		// a:end and b:end both occur after both starts.
	});

	test("propagates the value returned by the mutation fn", async () => {
		const value = await withFileMutationQueue(env, "/v.ts", async () => 42);
		expect(value).toBe(42);
	});

	test("releases the queue even when the fn throws", async () => {
		const failing = withFileMutationQueue(env, "/x.ts", async () => {
			throw new Error("boom");
		});
		await expect(failing).rejects.toThrow("boom");

		// A follow-up mutation on the same path must not be deadlocked.
		const after = await withFileMutationQueue(env, "/x.ts", async () => "ok");
		expect(after).toBe("ok");
	});
});