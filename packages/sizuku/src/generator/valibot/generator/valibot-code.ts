import type { Schema } from '../../../shared/types.js'
import { inferInput } from './infer-input.js'
import { valibot } from './valibot.js'

/**
 * @param schema
 * @param comment
 * @param type
 * @returns
 */
export function valibotCode(schema: Schema, comment: boolean, type: boolean): string {
  const valibotSchema = valibot(schema, comment)

  if (type) {
    const valibotInfer = inferInput(schema.name)
    return `${valibotSchema}\n\n${valibotInfer}\n`
  }
  return `${valibotSchema}\n`
}
