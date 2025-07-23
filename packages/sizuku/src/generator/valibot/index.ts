import path from 'node:path'
import type { Result } from 'neverthrow'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { buildSchemaExtractor } from '../../shared/helper/build-schema-extractor.js'
import { createExtractFieldFromProperty } from '../../shared/helper/create-extract-field-from-property.js'
import { createExtractRelationFieldFromProperty } from '../../shared/helper/create-extract-relation-field-from-property.js'
import { extractSchemas } from '../../shared/helper/extract-schemas.js'
import { parseFieldComments } from '../../shared/utils/index.js'
import { createExtractFieldsFromCallExpression } from './core/extract-schema.js'
import { valibotCode } from './generator/valibot-code.js'

/**
 * Generate Valibot schema
 * @param code - The code to generate Valibot schema from
 * @param output - The output file path
 * @param comment - Whether to include comments in the generated code
 * @param type - Whether to include type information in the generated code
 */
export async function sizukuValibot(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
): Promise<Result<void, Error>> {
  const extractField = createExtractFieldFromProperty((lines) => parseFieldComments(lines, '@v.'))

  const extractRelationField = createExtractRelationFieldFromProperty(
    (lines) => parseFieldComments(lines, '@v.'),
    'v',
  )

  const extractFieldsFromCall = createExtractFieldsFromCallExpression(
    extractField,
    extractRelationField,
  )

  const extractSchema = buildSchemaExtractor(extractFieldsFromCall, extractField)

  const valibotGeneratedCode = [
    'import * as v from "valibot"',
    '',
    ...extractSchemas(code, extractSchema).map((schema) =>
      valibotCode(schema, comment ?? false, type ?? false),
    ),
  ].join('\n')

  return await mkdir(path.dirname(output))
    .andThen(() => fmt(valibotGeneratedCode))
    .andThen((formatted) => writeFile(output, formatted))
}
