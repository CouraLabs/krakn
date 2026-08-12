/**
 * Per-path serialization queue for file mutations.
 *
 * Vendored & adapted from @earendil-works/pi-agent-core's
 * `dist/harness/tools/file-mutation-queue.js` — it is not re-exported from the
 * package root index, so it can't be imported directly. The implementation
 * serializes concurrent mutations targeting the same environment and canonical
 * path by chaining promises.
 *
 * Cleanup simplification vs upstream: upstream compares the live queue entry
 * against the chained promise before deleting; here we delete unconditionally
 * after release. `await current` guarantees the queue entry has drained before
 * we release, so any later enqueuer created a new chain off `next` — the only
 * cost of unconditional deletion is giving up serialization on a path that is
 * no longer active, which is harmless.
 */

import { getOrThrow } from "@earendil-works/pi-agent-core";
import type { ExecutionEnv } from "@earendil-works/pi-agent-core";

const queues = new Map<string, Promise<void>>();

export async function withFileMutationQueue<T>(
	env: ExecutionEnv,
	path: string,
	fn: () => Promise<T>,
): Promise<T> {
	const absolutePath = getOrThrow(await env.absolutePath(path));
	const canonical = await env.canonicalPath(absolutePath);
	const key = canonical.ok ? canonical.value : absolutePath;
	const current = queues.get(key) ?? Promise.resolve();
	let release: () => void = () => {};
	const next = new Promise<void>((resolve) => {
		release = resolve;
	});
	queues.set(key, current.then(() => next));
	await current;
	try {
		return await fn();
	} finally {
		release();
		queues.delete(key);
	}
}