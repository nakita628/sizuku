import { defineConfig } from "vite-plus";

export default defineConfig({
  // Formatting keeps oxfmt's defaults; this block only names what is not formatted. The TanStack
  // Router plugin writes routeTree.gen.ts again on every build and dev start, in its own layout,
  // so a check after a build would otherwise find it changed.
  fmt: {
    ignorePatterns: ["packages/sizuku/src/studio/client/routeTree.gen.ts"],
  },
});
