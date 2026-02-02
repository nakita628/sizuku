import { Resvg } from '@resvg/resvg-js'
import { run } from '@softwaretechnik/dbml-renderer'
import { mkdir, writeFile, writeFileBinary } from '../../shared/fsp/index.js'
import { extractRelationsFromSchema, parseTableInfo } from '../mermaid-er/validator/index.js'
import { dbmlContent } from './generator/index.js'

type Result =
  | { readonly ok: true; readonly value: undefined }
  | { readonly ok: false; readonly error: string }

/**
 * Generate DBML file
 */
const generateDbml = async (outputDir: string, content: string, fileName: string): Promise<Result> => {
  const outputFile = `${outputDir}/${fileName}`
  const writeResult = await writeFile(outputFile, content)

  if (!writeResult.ok) {
    return { ok: false, error: `Failed to write DBML: ${writeResult.error}` }
  }

  return { ok: true, value: undefined }
}

/**
 * Generate PNG from DBML
 */
const generatePng = async (outputDir: string, dbml: string, fileName: string): Promise<Result> => {
  const svg = run(dbml, 'svg')
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
    },
  })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  const outputFile = `${outputDir}/${fileName}`
  const writeResult = await writeFileBinary(outputFile, pngBuffer)

  if (!writeResult.ok) {
    return { ok: false, error: `Failed to write PNG: ${writeResult.error}` }
  }

  return { ok: true, value: undefined }
}

/**
 * Generate DBML schema and ER diagram PNG from Drizzle schema code
 *
 * @param code - The code to generate DBML from
 * @param output - The output directory path
 * @param dbmlFile - The DBML file name (default: schema.dbml)
 * @param pngFile - The PNG file name (default: er-diagram.png)
 */
export async function sizukuDBML(
  code: string[],
  output: string,
  dbmlFile: string = 'schema.dbml',
  pngFile: string = 'er-diagram.png',
): Promise<Result> {
  const tables = parseTableInfo(code)
  const relations = extractRelationsFromSchema(code)
  const content = dbmlContent(relations, tables)

  const mkdirResult = await mkdir(output)
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` }
  }

  const dbmlResult = await generateDbml(output, content, dbmlFile)
  if (!dbmlResult.ok) {
    return { ok: false, error: `❌ ${dbmlResult.error}` }
  }

  const pngResult = await generatePng(output, content, pngFile)
  if (!pngResult.ok) {
    return { ok: false, error: `❌ ${pngResult.error}` }
  }

  return { ok: true, value: undefined }
}
