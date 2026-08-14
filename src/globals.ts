import { homedir } from 'os';
import path from "node:path"
import { allThemes } from './tui/themes';
import type { TuiVariant } from './tui/context/app-context-types';

const app = {
  name: 'Krakn',
  version: 'v0.1',
  description: 'Krakn coding agent',
  settingsPath: path.join(homedir(), '.krakn'),
  cwd: process.cwd(),
  cwdView: process.cwd().replace(homedir(), '~')
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