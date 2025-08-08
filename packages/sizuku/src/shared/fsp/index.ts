import fsp from 'node:fs/promises'

/**
 * Creates a directory if it does not already exist.
 *
 * @param dir - Directory path to create.
 * @returns A `Result` that is `ok` on success, otherwise an error message.
 */
export async function mkdir(dir: string): Promise<
  | {
      ok: false
      error: string
    }
  | {
      ok: true
      value: undefined
    }
> {
  try {
    await fsp.mkdir(dir, { recursive: true })
    return {
      ok: true,
      value: undefined,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Writes UTF-8 text to a file, creating it if necessary.
 *
 * @param path - File path to write.
 * @param data - Text data to write.
 * @returns A `Result` that is `ok` on success, otherwise an error message.
 */
export async function writeFile(
  path: string,
  data: string,
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
  try {
    await fsp.writeFile(path, data, 'utf-8')
    return { ok: true, value: undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
