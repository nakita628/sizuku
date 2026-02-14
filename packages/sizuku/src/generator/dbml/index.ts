import { dirname } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { run } from '@softwaretechnik/dbml-renderer'
import { mkdir, writeFile, writeFileBinary } from '../../fsp/index.js'
import { extractRelationsFromSchema, parseTableInfo } from '../mermaid-er/validator/index.js'
import { dbmlContent } from './generator/index.js'

type Result =
  | { readonly ok: true; readonly value: undefined }
  | { readonly ok: false; readonly error: string }

/**
 * Generate DBML content string from Drizzle schema code
 */
function generateContent(code: string[]): string {
  const tables = parseTableInfo(code)
  const relations = extractRelationsFromSchema(code)
  return dbmlContent(relations, tables)
}

/**
 * Generate DBML file from Drizzle schema code
 *
 * @param code - The code to generate DBML from
 * @param output - The output file path (must end with .dbml)
 */
export async function sizukuDbmlFile(code: string[], output: string): Promise<Result> {
  const content = generateContent(code)

  const dir = dirname(output)
  const mkdirResult = await mkdir(dir)
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` }
  }

  const writeResult = await writeFile(output, content)
  if (!writeResult.ok) {
    return { ok: false, error: `❌ Failed to write DBML: ${writeResult.error}` }
  }

  return { ok: true, value: undefined }
}

/**
 * Generate PNG ER diagram from Drizzle schema code
 *
 * @param code - The code to generate PNG from
 * @param output - The output file path (must end with .png)
 */
/**
 * Generate ERD output (DBML or PNG) based on file extension
 */
export async function sizukuDbml(code: string[], output: string): Promise<Result> {
  if (output.endsWith('.png')) {
    return sizukuPng(code, output)
  }
  return sizukuDbmlFile(code, output)
}

export async function sizukuPng(code: string[], output: string): Promise<Result> {
  const content = generateContent(code)

  const svg = run(content, 'svg')
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
    },
  })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  const dir = dirname(output)
  const mkdirResult = await mkdir(dir)
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` }
  }

  const writeResult = await writeFileBinary(output, pngBuffer)
  if (!writeResult.ok) {
    return { ok: false, error: `❌ Failed to write PNG: ${writeResult.error}` }
  }

  return { ok: true, value: undefined }
}
