import { homedir, release } from 'os';
import path from "node:path"
import { allThemes } from './tui/themes';
import type { TuiVariant } from './tui/context/app-context-types';

/** Shell families the agent can target when generating commands. */
export type ShellKind = "powershell" | "bash" | "zsh" | "posix" | "cmd"

export interface DetectedShell {
  kind: ShellKind
  /** Basename of the shell binary (e.g. "bash", "zsh", "pwsh", "sh"). */
  name: string
  /** Executable used to run commands; resolvable via PATH when relative. */
  path: string
}

const OS_NAMES: Record<string, string> = {
  linux: "Linux",
  darwin: "macOS",
  win32: "Windows",
  freebsd: "FreeBSD",
  openbsd: "OpenBSD",
  sunos: "SunOS",
  aix: "AIX",
}

const shellKindOf = (name: string): ShellKind | undefined => {
  switch (name) {
    case "bash": return "bash"
    case "zsh": return "zsh"
    case "pwsh":
    case "powershell": return "powershell"
    case "cmd": return "cmd"
    default: return undefined
  }
}

/**
 * Best-effort detection of the shell the app was launched from.
 * Unix: $SHELL basename (unknown shells fall back to the POSIX family).
 * Windows: $SHELL if set, else PowerShell when installed, else cmd.
 * Reads process.env at call time; exported for tests.
 */
export const detectShell = (): DetectedShell => {
  const shellEnv = process.env.SHELL
  if (shellEnv) {
    const name = path.basename(shellEnv.replace(/\\/g, "/")).toLowerCase().replace(/\.exe$/, "")
    return { kind: shellKindOf(name) ?? "posix", name, path: shellEnv }
  }

  if (process.platform === "win32") {
    if (process.env.PSModulePath) return { kind: "powershell", name: "powershell", path: "powershell.exe" }
    return { kind: "cmd", name: "cmd", path: process.env.ComSpec ?? "cmd.exe" }
  }

  return { kind: "posix", name: "sh", path: "sh" }
}

const app = {
  name: 'Krakn',
  version: 'v0.1',
  description: 'Krakn coding agent',
  settingsPath: path.join(homedir(), '.krakn'),
  cwd: process.cwd(),
  cwdView: process.cwd().replace(homedir(), '~'),
  os: {
    name: OS_NAMES[process.platform] ?? process.platform,
    platform: process.platform,
    release: release(),
    arch: process.arch,
  },
  shell: detectShell(),
}

const THEMES = Object.keys(allThemes()).map((key) => ({ value: key, label: key }))
const THEME_VARIANTS: { value: TuiVariant, label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
]

export {
  app,
  THEMES,
  THEME_VARIANTS
}
