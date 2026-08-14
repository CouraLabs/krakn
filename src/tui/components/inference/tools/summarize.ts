const truncateStr = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max)}…` : s;

/**
 * Per-tool arg key whose value best summarizes the call in the ToolView
 * header, e.g. `path` for read/edit/write/ls, `command` for bash, `pattern`
 * for grep/find. The LLM may send params in any order, so grab the key that
 * makes sense for the tool instead of assuming a first one.
 */
const TOOL_ARG_KEY: Record<string, string> = {
  read: "path",
  write: "path",
  edit: "path",
  ls: "path",
  bash: "command",
  grep: "pattern",
  find: "pattern",
};

/** Keys tried in order for tools not in TOOL_ARG_KEY. */
const FALLBACK_ARG_KEYS = [
  "path",
  "command",
  "pattern",
  "query",
  "pat",
  "goal",
  "question",
  "prompt",
  "content",
];

/**
 * Summarize a tool call for the ToolView header, e.g. `src/foo.ts` from
 * `read` `{"path":"src/foo.ts","offset":10}` or `ls -la` from
 * `bash` `{"command":"ls -la"}`. Long values (e.g. bash commands) are
 * truncated. Empty on parse failure or when no meaningful arg is present.
 */
export const summarizeToolArg = (toolName: string, argsJson: string): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(argsJson);
  } catch {
    return "";
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "";
  }
  const obj = parsed as Record<string, unknown>;

  // Preferred key for the tool, then generic meaningful keys, then any value.
  const keys =
    TOOL_ARG_KEY[toolName] !== undefined
      ? [TOOL_ARG_KEY[toolName], ...FALLBACK_ARG_KEYS]
      : FALLBACK_ARG_KEYS;
  const values = [...keys, ...Object.keys(obj)]
    .map((k) => obj[k])
    .filter((v) => v !== undefined && v !== null)
    .map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  return truncateStr(values[0] ?? "", 60);
};
