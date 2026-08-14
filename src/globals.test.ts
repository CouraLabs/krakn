import { afterEach, describe, expect, test } from "bun:test";
import { detectShell } from "./globals";

const savedShell = process.env.SHELL;

afterEach(() => {
	if (savedShell === undefined) delete process.env.SHELL;
	else process.env.SHELL = savedShell;
});

describe("detectShell", () => {
	test("detects bash from $SHELL", () => {
		process.env.SHELL = "/bin/bash";
		expect(detectShell()).toEqual({ kind: "bash", name: "bash", path: "/bin/bash" });
	});

	test("detects zsh from $SHELL", () => {
		process.env.SHELL = "/bin/zsh";
		expect(detectShell()).toEqual({ kind: "zsh", name: "zsh", path: "/bin/zsh" });
	});

	test("detects powershell from pwsh.exe", () => {
		process.env.SHELL = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
		expect(detectShell()).toEqual({
			kind: "powershell",
			name: "pwsh",
			path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
		});
	});

	test("detects windows cmd from cmd.exe", () => {
		process.env.SHELL = "C:\\Windows\\System32\\cmd.exe";
		expect(detectShell()).toEqual({
			kind: "cmd",
			name: "cmd",
			path: "C:\\Windows\\System32\\cmd.exe",
		});
	});

	test("maps unknown unix shells to posix, keeping the real name", () => {
		process.env.SHELL = "/usr/bin/fish";
		expect(detectShell()).toEqual({ kind: "posix", name: "fish", path: "/usr/bin/fish" });
	});

	test("falls back to sh when $SHELL is unset on unix", () => {
		delete process.env.SHELL;
		expect(detectShell()).toEqual({ kind: "posix", name: "sh", path: "sh" });
	});
});
