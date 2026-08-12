import { type Static, Type } from "typebox";
import type { TruncationResult } from "@earendil-works/pi-agent-core";

export const readSchema = Type.Object({
	path: Type.String({ description: "Path to the file to read (relative or absolute)" }),
	offset: Type.Optional(
		Type.Integer({
			minimum: 1,
			description: "Line number to start reading from (1-indexed)",
		}),
	),
	limit: Type.Optional(
		Type.Integer({
			minimum: 1,
			description: "Maximum number of lines to read",
		}),
	),
	raw: Type.Optional(
		Type.Boolean({
			description:
				"Return plain text without LINE#HASH anchors. Saves tokens when you do not plan to edit this file.",
		}),
	),
});

export type ReadToolInput = Static<typeof readSchema>;

export interface ReadToolDetails {
	truncation?: TruncationResult;
	snapshotId?: string;
	nextOffset?: number;
}