const DEFAULT_MAX_BYTES = 50 * 1024; // matches the SDK truncate default

type TruncationLike = {
  truncated?: boolean;
  truncatedBy?: "lines" | "bytes" | null;
  outputLines?: number;
  totalLines?: number;
  maxBytes?: number;
};

/** Mirror the SDK's formatSize (truncate.d.ts:46) for notice strings. */
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const sizeLimitWarning = (t: TruncationLike): string =>
  `${formatSize(t.maxBytes ?? DEFAULT_MAX_BYTES)} limit`;

/** bash: `{ truncation?; fullOutputPath? }` (bash.d.ts:10-13). */
export const bashWarnings = (details: unknown): string[] => {
  if (!details || typeof details !== "object") return [];
  const d = details as { truncation?: TruncationLike; fullOutputPath?: string };
  const w: string[] = [];
  if (d.fullOutputPath) w.push(`Full output: ${d.fullOutputPath}`);
  const t = d.truncation;
  if (t?.truncated) {
    if (t.truncatedBy === "lines") {
      w.push(`Truncated: showing ${t.outputLines} of ${t.totalLines} lines`);
    } else {
      w.push(`Truncated: ${t.outputLines} lines shown (${sizeLimitWarning(t)})`);
    }
  }
  return w;
};

/** grep: `{ truncation?; matchLimitReached?; linesTruncated? }` (grep.d.ts:15-19). */
export const grepWarnings = (details: unknown): string[] => {
  if (!details || typeof details !== "object") return [];
  const d = details as {
    truncation?: TruncationLike;
    matchLimitReached?: number;
    linesTruncated?: boolean;
  };
  const w: string[] = [];
  if (d.matchLimitReached) w.push(`${d.matchLimitReached} matches limit`);
  if (d.truncation?.truncated) w.push(sizeLimitWarning(d.truncation));
  if (d.linesTruncated) w.push("some lines truncated");
  return w;
};

/** find: `{ truncation?; resultLimitReached? }` (find.d.ts:11-14). */
export const findWarnings = (details: unknown): string[] => {
  if (!details || typeof details !== "object") return [];
  const d = details as { truncation?: TruncationLike; resultLimitReached?: number };
  const w: string[] = [];
  if (d.resultLimitReached) w.push(`${d.resultLimitReached} results limit`);
  if (d.truncation?.truncated) w.push(sizeLimitWarning(d.truncation));
  return w;
};

/** ls: `{ truncation?; entryLimitReached? }` (ls.d.ts:10-13). */
export const lsWarnings = (details: unknown): string[] => {
  if (!details || typeof details !== "object") return [];
  const d = details as { truncation?: TruncationLike; entryLimitReached?: number };
  const w: string[] = [];
  if (d.entryLimitReached) w.push(`${d.entryLimitReached} entries limit`);
  if (d.truncation?.truncated) w.push(sizeLimitWarning(d.truncation));
  return w;
};
