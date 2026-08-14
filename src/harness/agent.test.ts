import { describe, expect, test } from "bun:test";
import { UsageLedger } from "./agent";
import type { Usage } from "@earendil-works/pi-ai";

/** 4 chars per token, ceil — matches the ledger's estimate. */
const usage = (
	input: number,
	output: number,
	cacheRead: number,
	cacheWrite: number,
): Usage => ({
	input,
	output,
	cacheRead,
	cacheWrite,
	totalTokens: input + output + cacheRead + cacheWrite,
	cost: {
		input: input / 100,
		output: output / 100,
		cacheRead: cacheRead / 100,
		cacheWrite: cacheWrite / 100,
		total: (input + output + cacheRead + cacheWrite) / 100,
	},
});

describe("UsageLedger", () => {
	test("starts at zero", () => {
		const snap = new UsageLedger().snapshot();
		expect(snap.type).toBe("usage_update");
		expect(snap.tokens).toEqual({ in: 0, out: 0, cr: 0, cw: 0, total: 0 });
		expect(snap.cost).toEqual({ in: 0, out: 0, cr: 0, cw: 0, total: 0 });
	});

	test("streamed deltas increment the live output estimate", () => {
		const ledger = new UsageLedger();

		// tokenx estimates: "hello" and "world" are short lowercase words -> 1 token each.
		const text = ledger.trackDelta({ type: "text_delta", delta: "hello" });
		expect(text?.tokens.out).toBe(1);
		expect(text?.tokens.total).toBe(1);
		// Cost only lands with the real usage block at message_end.
		expect(text?.cost).toEqual({ in: 0, out: 0, cr: 0, cw: 0, total: 0 });

		const thinking = ledger.trackDelta({ type: "thinking_delta", delta: "world" });
		expect(thinking?.tokens.out).toBe(2);

		const tool = ledger.trackDelta({ type: "toolcall_delta", delta: '{"a":1}' });
		expect(tool?.tokens.out).toBe(7);
		expect(tool?.tokens.total).toBe(7);
	});

	test("commit replaces the live estimate with the real usage block", () => {
		const ledger = new UsageLedger();
		// "x".repeat(10) estimates to 2 tokens, then the real block lands.
		ledger.trackDelta({ type: "text_delta", delta: "x".repeat(10) });

		const snap = ledger.commit(usage(100, 25, 10, 5));
		expect(snap.tokens).toEqual({ in: 100, out: 25, cr: 10, cw: 5, total: 140 });
		expect(snap.cost).toEqual({ in: 1, out: 0.25, cr: 0.1, cw: 0.05, total: 1.4 });

		// A fresh message streams on top of the committed totals ("abcd" -> 1 token).
		const live = ledger.trackDelta({ type: "thinking_delta", delta: "abcd" });
		expect(live?.tokens.out).toBe(26);
		expect(live?.tokens.total).toBe(141);
	});

	test("usage accumulates across messages", () => {
		const ledger = new UsageLedger();
		ledger.commit(usage(100, 25, 10, 5));
		const snap = ledger.commit(usage(50, 10, 0, 0));

		expect(snap.tokens).toEqual({ in: 150, out: 35, cr: 10, cw: 5, total: 200 });
		expect(snap.cost.total).toBe(2);
	});
});
