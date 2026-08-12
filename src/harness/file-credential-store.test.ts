import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FileCredentialStore } from "./file-credential-store";
import type { Credential } from "@earendil-works/pi-ai";

let authPath: string;

const apiKey = (key: string): Credential => ({ type: "api_key", key });

beforeAll(() => {
	authPath = join(mkdtempSync(join(tmpdir(), "krakn-auth-")), "auth.json");
});

afterAll(() => {
	rmSync(authPath, { recursive: true, force: true });
});

describe("FileCredentialStore", () => {
	test("returns undefined for a missing credential", async () => {
		const store = new FileCredentialStore(authPath);
		expect(await store.read("provider-a")).toBeUndefined();
	});

	test("modify writes the credential and persists it to disk", async () => {
		const store = new FileCredentialStore(authPath);
		const cred = apiKey("sk-123");
		await store.modify("provider-a", async () => cred);

		expect(await store.read("provider-a")).toEqual(cred);
		// Persisted as a Record<providerId, Credential>.
		const onDisk = JSON.parse(readFileSync(authPath, "utf-8"));
		expect(onDisk["provider-a"]).toEqual(cred);
	});

	test("list returns non-secret metadata per provider", async () => {
		const store = new FileCredentialStore(authPath);
		await store.modify("provider-a", async () => apiKey("sk-a"));
		await store.modify("provider-b", async () => apiKey("sk-b"));

		const listed = await store.list();
		expect(listed).toEqual([
			{ providerId: "provider-a", type: "api_key" },
			{ providerId: "provider-b", type: "api_key" },
		]);
	});

	test("modify sees the current credential and can update it", async () => {
		const store = new FileCredentialStore(authPath);
		let seen: unknown;
		await store.modify("provider-a", async (current) => {
			seen = current;
			return apiKey("sk-updated");
		});
		expect(seen).toEqual(apiKey("sk-a")); // whatever was on disk from prior tests
		expect(await store.read("provider-a")).toEqual(apiKey("sk-updated"));
	});

	test("serializes concurrent modifies without lost updates", async () => {
		const store = new FileCredentialStore(authPath);
		await store.modify("provider-c", async () => apiKey("sk-0"));

		// Two concurrent updates, each appending its own suffix. Serialization
		// per provider chains them, so the second reads the first's write and
		// both increments land — no lost update.
		await Promise.all([
			store.modify("provider-c", async (c) => apiKey(`${c!.key}-1`)),
			store.modify("provider-c", async (c) => apiKey(`${c!.key}-2`)),
		]);

		const final = await store.read("provider-c");
		expect(["sk-0-1-2", "sk-0-2-1"]).toContain(final!.key as string);
	});

	test("returns undefined for a store whose file fails to parse", async () => {
		writeFileSync(authPath, "{ not valid json");
		const store = new FileCredentialStore(authPath);
		expect(await store.read("provider-a")).toBeUndefined();
	});

	test("delete removes the credential and persists", async () => {
		const store = new FileCredentialStore(authPath);
		await store.modify("provider-d", async () => apiKey("sk-d"));
		expect(await store.read("provider-d")).toBeDefined();

		await store.delete("provider-d");
		expect(await store.read("provider-d")).toBeUndefined();
		const onDisk = JSON.parse(readFileSync(authPath, "utf-8"));
		expect(onDisk["provider-d"]).toBeUndefined();
		expect(existsSync(authPath)).toBe(true);
	});
});