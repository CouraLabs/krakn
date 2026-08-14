/**
 * Map a file path to a tree-sitter filetype for syntax highlighting.
 * Returns undefined to let the `code` renderable autodetect.
 */
export const inferFiletype = (path: string): string | undefined => {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    zig: "zig",
    sh: "shell",
    bash: "shell",
  };
  return ext ? map[ext] : undefined;
};

/**
 * Infer the highlighted filetype from the tool call's `path` arg.
 * Returns undefined when the arg is missing or unparseable.
 */
export const argFiletype = (argsJson: string): string | undefined => {
  let path: string | undefined;
  try {
    path = (JSON.parse(argsJson) as { path?: string })?.path;
  } catch {
    path = undefined;
  }
  return path ? inferFiletype(path) : undefined;
};
