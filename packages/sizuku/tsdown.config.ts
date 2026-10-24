import { defineConfig } from "tsdown";

export default defineConfig({
  // `index` is what `import { defineConfig } from "sizuku"` loads; `cli` is the command.
  entry: { index: "src/index.ts", cli: "src/cli.ts" },
  format: "esm",
  dts: true,
  clean: true,
  outDir: "dist",
});
