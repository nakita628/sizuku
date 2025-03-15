import fs from 'node:fs'
import type { Config } from '../../../common/config'
import { DEFAULT_CONFIG } from '../../../common/config'

/**
 * Loads the configuration from the `sizuku.json` file or returns the default configuration.
 *
 * @returns The configuration object.
 */
export function getConfig(): Config {
  const config: Config = fs.existsSync('sizuku-valibot.json')
    ? { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync('sizuku-valibot.json', 'utf-8')) }
    : DEFAULT_CONFIG
  return config
}
