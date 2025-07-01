/**
 * @param name
 * @returns
 */
export function inferInput(name: string) {
  return `export type ${name} = v.InferInput<typeof ${name}Schema>`
}
