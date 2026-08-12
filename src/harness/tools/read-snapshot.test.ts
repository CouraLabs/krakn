import { beforeEach, describe, expect, test } from "bun:test";
import {
	getReadSnapshot,
	getReadSnapshotVersions,
	rememberReadSnapshot,
	resetReadSnapshot,
} from "./read-snapshot";

const p = (n: number): string => `/paths/${n}`;

describe("read-snapshot store", () => {
	beforeEach(() => resetReadSnapshot());

	test("returns null when no snapshot exists for a path", () => {
		expect(getReadSnapshot(p(0))).toBeNull();
		expect(getReadSnapshotVersions(p(0))).toEqual([]);
	});

	test("stores and returns a snapshot", () => {
		rememberReadSnapshot(p(0), "content-1");
		expect(getReadSnapshot(p(0))).toBe("content-1");
		expect(getReadSnapshotVersions(p(0))).toEqual(["content-1"]);
	});

	test("keeps versions in newest-first order", () => {
		rememberReadSnapshot(p(0), "v0");
		rememberReadSnapshot(p(0), "v1");
		rememberReadSnapshot(p(0), "v2");
		expect(getReadSnapshot(p(0))).toBe("v2");
		expect(getReadSnapshotVersions(p(0))).toEqual(["v2", "v1", "v0"]);
	});

	test("deduplicates byte-identical reads (read fusion)", () => {
		rememberReadSnapshot(p(0), "v0");
		rememberReadSnapshot(p(0), "v0"); // no-op
		expect(getReadSnapshotVersions(p(0))).toEqual(["v0"]);
	});

	test("caps versions per path at 4, dropping the oldest", () => {
		for (const v of ["v0", "v1", "v2", "v3", "v4"]) {
			rememberReadSnapshot(p(0), v);
		}
		expect(getReadSnapshotVersions(p(0))).toEqual(["v4", "v3", "v2", "v1"]);
	});

	test("evicts the least-recently-used path when the path limit is reached", () => {
		// Fill to the 8-path limit.
		for (let i = 1; i <= 8; i++) {
			rememberReadSnapshot(p(i), "x");
		}
		expect(getReadSnapshot(p(1))).not.toBeNull();
		expect(getReadSnapshot(p(8))).not.toBeNull();

		// Adding a 9th distinct path evicts the LRU one (p1, least recently used).
		rememberReadSnapshot(p(9), "x");
		expect(getReadSnapshot(p(1))).toBeNull();
		expect(getReadSnapshot(p(9))).toBe("x");
		// The rest are retained.
		expect(getReadSnapshot(p(8))).not.toBeNull();
		expect(getReadSnapshot(p(2))).not.toBeNull();
	});

	test("re-touching a path promotes it so an idle path is evicted instead", () => {
		for (let i = 1; i <= 7; i++) {
			rememberReadSnapshot(p(i), "x");
		}
		// p1 is now the LRU. Re-touch it to promote it to MRU.
		rememberReadSnapshot(p(1), "fresh");
		// Fill remaining capacity: p8, p9 - path cap is 8.
		rememberReadSnapshot(p(8), "x");
		// Now p2 should have become the LRU (idle the longest).
		rememberReadSnapshot(p(9), "x");
		expect(getReadSnapshot(p(1))).toBe("fresh");
		expect(getReadSnapshot(p(2))).toBeNull();
	});
});