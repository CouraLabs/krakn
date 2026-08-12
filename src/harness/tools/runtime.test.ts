import { describe, expect, test } from "bun:test";
import { throwIfAborted } from "./runtime";

describe("throwIfAborted", () => {
	test("is a no-op when no signal is provided", () => {
		expect(() => throwIfAborted()).not.toThrow();
	});

	test("is a no-op when the signal is not aborted", () => {
		const controller = new AbortController();
		expect(() => throwIfAborted(controller.signal)).not.toThrow();
	});

	test("throws once the signal has been aborted", () => {
		const controller = new AbortController();
		controller.abort();
		expect(() => throwIfAborted(controller.signal)).toThrow("Operation aborted");
	});
});