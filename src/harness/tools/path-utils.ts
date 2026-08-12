import { getOrThrow, type ExecutionEnv } from "@earendil-works/pi-agent-core";
import * as os from "os";
import { isAbsolute, resolve as resolvePath } from "path";

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

function expandPath(filePath: string): string {
	if (filePath === "~") return os.homedir();
	if (filePath.startsWith("~/")) return os.homedir() + filePath.slice(1);
	return filePath;
}

export function resolveToCwd(filePath: string, cwd: string): string {
	const expanded = expandPath(filePath);
	return isAbsolute(expanded) ? expanded : resolvePath(cwd, expanded);
}

export function normalizeToolPath(path: string): string {
	const normalized = path.replace(UNICODE_SPACES, " ");
	return normalized.startsWith("@") ? normalized.slice(1) : normalized;
}

export async function resolveToolPath(env: ExecutionEnv, path: string, signal?: AbortSignal): Promise<string> {
	return getOrThrow(await env.absolutePath(normalizeToolPath(path), signal));
}