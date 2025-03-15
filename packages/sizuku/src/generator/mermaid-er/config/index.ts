import fs from 'node:fs'

export type Config = {
  input?: string
  output?: string
}

/**
 * Loads the configuration from the `sizuku.json` file or returns the default configuration.
 *
 * @returns The configuration object.
 */
export function getConfig(): Config {
  const config: Config = fs.existsSync('sizuku-mermaid-er.json')
    ? { ...JSON.parse(fs.readFileSync('sizuku-mermaid-er.json', 'utf-8')) }
    : {}
  return config
}
