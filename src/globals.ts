import { homedir } from 'os';
import path from "node:path"

const app = {
  name: 'Krakn',
  version: 'v0.1',
  description: 'Krakn coding agent',
  settingsPath: path.join(homedir(), '.krakn'),
}

export {
  app
}