import { inferInput } from '../../../utils/index.js'
import { valibot } from './valibot.js'

/**
 * @param schema
 * @param comment
 * @param type
 * @returns
 */
export function valibotCode(
  schema: {
    name: string
    fields: {
      name: string
      definition: string
      description?: string
    }[]
    objectType?: 'strict' | 'loose'
  },
  comment: boolean,
  type: boolean,
): string {
  const valibotSchema = valibot(schema, comment)

  if (type) {
    const valibotInfer = inferInput(schema.name)
    return `${valibotSchema}\n\n${valibotInfer}\n`
  }
  return `${valibotSchema}\n`
}
