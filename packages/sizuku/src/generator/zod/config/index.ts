import fs from 'node:fs'
import type { Config } from '../../../shared/config/index.js'
import { DEFAULT_CONFIG } from '../../../shared/config/index.js'

/**
 * Loads the configuration from the `sizuku.json` file or returns the default configuration.
 *
 * @function getConfig
 * @returns The configuration object.
 */
export function getConfig(): Config {
  const config: Config = fs.existsSync('sizuku-zod.json')
    ? { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync('sizuku-zod.json', 'utf-8')) }
    : DEFAULT_CONFIG
  return config
}
