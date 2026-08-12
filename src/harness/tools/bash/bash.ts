import { 
  DEFAULT_MAX_BYTES, 
  DEFAULT_MAX_LINES, 
  executeShellWithCapture, 
  formatSize, 
  getOrThrow,
  type AgentTool,
  type ExecutionToolContext, 
  type ShellCaptureProgress, 
  type TruncationResult 
} from "@earendil-works/pi-agent-core";
import { type Static, Type } from "typebox";
import { NodeExecutionEnv } from "../tool-context";
import { loadPrompt } from "../prompt-loader";

const BASH_DESC = loadPrompt(new URL("../../prompts/bash.md", import.meta.url))
	.replaceAll("{{DEFAULT_MAX_LINES}}", String(DEFAULT_MAX_LINES))
	.replaceAll("{{DEFAULT_MAX_BYTES}}", formatSize(DEFAULT_MAX_BYTES))
	.trim();

const MAX_TIMEOUT_SECONDS = 2_147_483_647 / 1000;
const BASH_UPDATE_THROTTLE_MS = 100;

const bashSchema = Type.Object({
	command: Type.String({ description: "Bash command to execute" }),
	timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),
});

export type BashToolInput = Static<typeof bashSchema>;

export interface BashToolDetails {
	truncation?: TruncationResult;
	fullOutputPath?: string;
}

export interface BashExecution {
	command: string;
	cwd: string;
	env: Record<string, string>;
	inheritEnv: boolean;
}

export type BashPrepare<TContext extends ExecutionToolContext = ExecutionToolContext> = (
	execution: BashExecution,
	context: TContext,
	signal?: AbortSignal,
) => void | Promise<void>;

export interface BashToolOptions<TContext extends ExecutionToolContext = ExecutionToolContext> {
	commandPrefix?: string;
	prepare?: BashPrepare<TContext>;
}

function validateTimeout(timeout: number | undefined): void {
	if (timeout === undefined) return;
	if (!Number.isFinite(timeout) || timeout <= 0) {
		throw new Error("Invalid timeout: must be a finite number of seconds");
	}
	if (timeout > MAX_TIMEOUT_SECONDS) {
		throw new Error(`Invalid timeout: maximum is ${MAX_TIMEOUT_SECONDS} seconds`);
	}
}

export function createBashTool(
  env: NodeExecutionEnv, 
	options?: BashToolOptions<ExecutionToolContext>,
): AgentTool<typeof bashSchema, BashToolDetails | undefined> {
	return {
		name: "bash",
		label: "bash",
		description: BASH_DESC,
		parameters: bashSchema,
    
		async execute(toolCallId, params, signal?: AbortSignal, onUpdate?) {
      const { timeout, command } = params
			validateTimeout(timeout);
			const execution: BashExecution = {
				command: options?.commandPrefix ? `${options.commandPrefix}\n${command}` : command,
				cwd: env.cwd,
				env: {},
				inheritEnv: true,
			};
			await options?.prepare?.(execution, { env }, signal);
			let getLatestProgress: (() => ShellCaptureProgress) | undefined;
			let updateTimer: ReturnType<typeof setTimeout> | undefined;
			let updateDirty = false;
			let lastUpdateAt = 0;

			const emitOutputUpdate = (): void => {
				if (!onUpdate || !updateDirty || !getLatestProgress) return;
				updateDirty = false;
				lastUpdateAt = Date.now();
				const progress = getLatestProgress();
				onUpdate({
					content: [{ type: "text", text: progress.output }],
					details: {
						truncation: progress.truncation.truncated ? progress.truncation : undefined,
						fullOutputPath: progress.fullOutputPath,
					},
				});
			};
			const clearUpdateTimer = (): void => {
				if (!updateTimer) return;
				clearTimeout(updateTimer);
				updateTimer = undefined;
			};
			const scheduleOutputUpdate = (): void => {
				if (!onUpdate) return;
				updateDirty = true;
				const delay = BASH_UPDATE_THROTTLE_MS - (Date.now() - lastUpdateAt);
				if (delay <= 0) {
					clearUpdateTimer();
					emitOutputUpdate();
					return;
				}
				updateTimer ??= setTimeout(() => {
					updateTimer = undefined;
					emitOutputUpdate();
				}, delay);
			};

			onUpdate?.({ content: [], details: undefined });
			try {
				const capture = getOrThrow(
					await executeShellWithCapture(env, execution.command, {
						cwd: execution.cwd,
						env: execution.env,
						inheritEnv: execution.inheritEnv,
						timeout,
						abortSignal: signal,
						returnExecutionErrors: true,
						onChunk: (_chunk, getProgress) => {
							getLatestProgress = getProgress;
							scheduleOutputUpdate();
						},
					}),
				);
				clearUpdateTimer();
				getLatestProgress = () => capture;
				updateDirty = true;
				emitOutputUpdate();

				let outputText = capture.output;
				let details: BashToolDetails | undefined;
				if (capture.truncation.truncated) {
					details = { truncation: capture.truncation, fullOutputPath: capture.fullOutputPath };
					const startLine = capture.truncation.totalLines - capture.truncation.outputLines + 1;
					const endLine = capture.truncation.totalLines;
					if (capture.truncation.lastLinePartial) {
						const lastLineSize = formatSize(capture.lastLineBytes);
						outputText += `\n\n[Showing last ${formatSize(capture.truncation.outputBytes)} of line ${endLine} (line is ${lastLineSize}). Full output: ${capture.fullOutputPath}]`;
					} else if (capture.truncation.truncatedBy === "lines") {
						outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${capture.truncation.totalLines}. Full output: ${capture.fullOutputPath}]`;
					} else {
						outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${capture.truncation.totalLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Full output: ${capture.fullOutputPath}]`;
					}
				}

				const appendStatus = (status: string): string => `${outputText ? `${outputText}\n\n` : ""}${status}`;
				if (capture.cancelled) throw new Error(appendStatus("Command aborted"));
				if (capture.executionError?.code === "timeout") {
					throw new Error(appendStatus(`Command timed out after ${timeout} seconds`), {
						cause: capture.executionError,
					});
				}
				if (capture.executionError) throw capture.executionError;
				if (capture.exitCode !== 0 && capture.exitCode !== undefined) {
					throw new Error(appendStatus(`Command exited with code ${capture.exitCode}`));
				}
				return { content: [{ type: "text", text: outputText || "(no output)" }], details };
			} finally {
				clearUpdateTimer();
			}
		},
	};
}