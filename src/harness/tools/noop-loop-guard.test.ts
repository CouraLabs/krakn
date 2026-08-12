import { beforeEach, describe, expect, test } from "bun:test";
import {
	NOOP_HARD_LIMIT,
	clearAppliedPayload,
	isDuplicateAppliedPayload,
	recordAppliedEdit,
	recordNoopEdit,
	resetNoopLoopGuard,
} from "./noop-loop-guard";

describe("noop-loop-guard", () => {
	beforeEach(() => resetNoopLoopGuard());

	test("increments the count for the same path+payloadKey", () => {
		const first = recordNoopEdit("/a.ts", "k");
		expect(first).toEqual({ count: 1, escalate: false });
		const second = recordNoopEdit("/a.ts", "k");
		expect(second).toEqual({ count: 2, escalate: false });
	});

	test("escalates once the hard limit is reached", () => {
		recordNoopEdit("/a.ts", "k");
		recordNoopEdit("/a.ts", "k");
		const third = recordNoopEdit("/a.ts", "k");
		expect(third.count).toBe(NOOP_HARD_LIMIT);
		expect(third.escalate).toBe(true);
	});

	test("a different payloadKey resets the counter (new payload = progress)", () => {
		recordNoopEdit("/a.ts", "k");
		recordNoopEdit("/a.ts", "k");
		const reset = recordNoopEdit("/a.ts", "k2");
		expect(reset).toEqual({ count: 1, escalate: false });
	});

	test("counters are per-path", () => {
		recordNoopEdit("/a.ts", "k");
		recordNoopEdit("/a.ts", "k");
		expect(recordNoopEdit("/b.ts", "k")).toEqual({ count: 1, escalate: false });
	});

	test("recordAppliedEdit clears the noop counter and records the applied payload", () => {
		recordNoopEdit("/a.ts", "k");
		recordNoopEdit("/a.ts", "k");
		recordAppliedEdit("/a.ts", "applied-1");
		// Noop tracking is gone, so a fresh attempt starts at 1 again.
		expect(recordNoopEdit("/a.ts", "applied-1")).toEqual({ count: 1, escalate: false });
		expect(isDuplicateAppliedPayload("/a.ts", "applied-1")).toBe(true);
	});

	test("isDuplicateAppliedPayload is false before any applied edit", () => {
		expect(isDuplicateAppliedPayload("/a.ts", "anything")).toBe(false);
	});

	test("isDuplicateAppliedPayload is false for a different payload", () => {
		recordAppliedEdit("/a.ts", "applied-1");
		expect(isDuplicateAppliedPayload("/a.ts", "applied-2")).toBe(false);
	});

	test("clearAppliedPayload removes the duplicate record", () => {
		recordAppliedEdit("/a.ts", "applied-1");
		expect(isDuplicateAppliedPayload("/a.ts", "applied-1")).toBe(true);
		clearAppliedPayload("/a.ts");
		expect(isDuplicateAppliedPayload("/a.ts", "applied-1")).toBe(false);
	});
});