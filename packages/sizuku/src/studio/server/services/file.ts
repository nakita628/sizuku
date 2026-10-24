import path from "node:path";
import { layer as nodeFileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { Effect, FileSystem } from "effect";
import type { PlatformError } from "effect";
import { FileReadError, FileWriteError } from "../errors/index.js";

/**
 * The studio's file access, over Effect's FileSystem. The Node layer is provided here, so the use
 * cases and handlers that read the schema stay free of a requirement they would only pass on.
 */
function withNodeFileSystem<A, E>(effect: Effect.Effect<A, E, FileSystem.FileSystem>) {
  return effect.pipe(Effect.provide(nodeFileSystemLayer));
}

export function readText(file: string) {
  return withNodeFileSystem(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      return yield* fs.readFileString(file);
    }).pipe(Effect.mapError((error) => new FileReadError({ path: file, cause: error.message }))),
  );
}

/** Null when the file does not exist; any other failure is an error. */
export function readTextIfExists(file: string) {
  return withNodeFileSystem(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      return yield* fs.readFileString(file);
    }).pipe(
      Effect.catchIf(
        (error: PlatformError.PlatformError) => error.reason._tag === "NotFound",
        () => Effect.succeed(null),
      ),
      Effect.mapError((error) => new FileReadError({ path: file, cause: error.message })),
    ),
  );
}

export function writeText(file: string, text: string) {
  return withNodeFileSystem(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(path.dirname(file), { recursive: true });
      yield* fs.writeFileString(file, text);
    }).pipe(Effect.mapError((error) => new FileWriteError({ path: file, cause: error.message }))),
  );
}

/** Whether the path exists at all. */
export function exists(file: string) {
  return withNodeFileSystem(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      return yield* fs.exists(file);
    }).pipe(Effect.orElseSucceed(() => false)),
  );
}
