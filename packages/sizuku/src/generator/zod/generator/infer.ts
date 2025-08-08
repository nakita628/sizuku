/**
 * @param name
 * @returns
 */
export function infer(name: string) {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
  return `export type ${capitalizedName} = z.infer<typeof ${capitalizedName}Schema>`
}
