import fs from "node:fs/promises";
import path from "node:path";
import { Effect } from "effect";
import { FileReadError, FileWriteError } from "../errors/index.js";

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function readText(file: string) {
  return Effect.tryPromise({
    try: () => fs.readFile(file, "utf-8"),
    catch: (error) => new FileReadError({ path: file, cause: message(error) }),
  });
}

/** Null when the file does not exist; any other failure is an error. */
export function readTextIfExists(file: string) {
  return Effect.tryPromise({
    try: async () => {
      try {
        return await fs.readFile(file, "utf-8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    catch: (error) => new FileReadError({ path: file, cause: message(error) }),
  });
}

export function writeText(file: string, text: string) {
  return Effect.tryPromise({
    try: async () => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, text, "utf-8");
    },
    catch: (error) => new FileWriteError({ path: file, cause: message(error) }),
  });
}
