import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { run } from '@softwaretechnik/dbml-renderer'
import { mkdir, writeFile, writeFileBinary } from '../../shared/fsp/index.js'
import { dbmlContent } from '../dbml/generator/index.js'
import { extractRelationsFromSchema, parseTableInfo } from '../mermaid-er/validator/index.js'

type DiagramFormat = 'svg' | 'png' | 'dot'

/**
 * Generate diagram from Drizzle schema code
 *
 * @param code - The code to generate diagram from
 * @param output - The output file path
 * @param format - Output format ('svg', 'png', or 'dot')
 */
export async function sizukuSVG(
  code: string[],
  output: string,
  format: DiagramFormat = 'png'
): Promise<
  | {
      ok: true
      value: undefined
    }
  | {
      ok: false
      error: string
    }
> {
  const tables = parseTableInfo(code)
  const relations = extractRelationsFromSchema(code)

  // Generate DBML content
  const dbml = dbmlContent(relations, tables)

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }

  // Render based on format
  if (format === 'dot') {
    const dot = run(dbml, 'dot')
    const writeResult = await writeFile(output, dot)
    if (!writeResult.ok) {
      return { ok: false, error: writeResult.error }
    }
  } else {
    // Generate SVG using dbml-renderer
    const svg = run(dbml, 'svg')

    if (format === 'png') {
      // Convert SVG to PNG
      const resvg = new Resvg(svg, {
        font: {
          loadSystemFonts: true,
        },
      })
      const pngData = resvg.render()
      const pngBuffer = pngData.asPng()

      const writeResult = await writeFileBinary(output, pngBuffer)
      if (!writeResult.ok) {
        return { ok: false, error: writeResult.error }
      }
    } else {
      // SVG format
      const writeResult = await writeFile(output, svg)
      if (!writeResult.ok) {
        return { ok: false, error: writeResult.error }
      }
    }
  }

  return {
    ok: true,
    value: undefined,
  }
}
