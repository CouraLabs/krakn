/**
 * Consolidated type surface for the tools/ root modules.
 */

export type LoadedFile =
	| { kind: "directory" }
	| { kind: "image"; mimeType: string }
	| { kind: "text"; text: string; hadUtf8DecodeErrors?: true }
	| { kind: "binary"; description: string };

export type SnapshotInfo = {
	snapshotId: string;
	mtimeMs: number;
	size: number;
};

export interface NoopEntry {
	payloadKey: string;
	count: number;
}

export interface PathEntry {
	// Versions in newest-first order.
	versions: string[];
}

export interface ShellConfig {
	shell: string;
	args: string[];
	commandTransport?: "argv" | "stdin";
}