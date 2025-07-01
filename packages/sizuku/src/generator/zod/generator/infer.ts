/**
 * @param name
 * @returns
 */
export function infer(name: string) {
  return `export type ${name} = z.infer<typeof ${name}Schema>`
}
