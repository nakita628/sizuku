import path from "node:path";
import { getRequestListener } from "@hono/node-server";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { Effect } from "effect";
import { defineConfig } from "vite-plus";
import type { Plugin } from "vite-plus";
import { createStudioApi } from "./src/studio/server/app.js";
import { connectDatabase } from "./src/studio/server/services/database.js";
import { configureStudio } from "./src/studio/server/services/studio.js";

const CLIENT_ROOT = path.resolve(import.meta.dirname, "src/studio/client");
const OUT_DIR = path.resolve(import.meta.dirname, "dist/studio");

// `vp dev -c vite.studio.config.ts` serves the client with hot reload and the API in the same
// process. SIZUKU_SCHEMA picks the schema (default: the studio example), SIZUKU_DATABASE_URL
// connects it to a database.
function studioApi(): Plugin {
  return {
    name: "sizuku-studio-api",
    apply: "serve",
    async configureServer(server) {
      const schemaPath = path.resolve(
        process.env.SIZUKU_SCHEMA ??
          path.resolve(import.meta.dirname, "../../examples/studio/db/schema.ts"),
      );
      const cwd = process.cwd();
      const database = await Effect.runPromise(
        connectDatabase({ url: process.env.SIZUKU_DATABASE_URL ?? null, cwd }),
      );
      configureStudio({ schemaPath, cwd, database });
      const api = createStudioApi();
      const listener = getRequestListener((request) => api.fetch(request));
      // Mounting on '/api' would strip the prefix the Hono app routes on, so the path is checked here.
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/")) {
          void listener(req, res);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: CLIENT_ROOT,
  plugins: [
    // File-based routes under src/studio/client/routes → routeTree.gen.ts.
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.join(CLIENT_ROOT, "routes"),
      generatedRouteTree: path.join(CLIENT_ROOT, "routeTree.gen.ts"),
      quoteStyle: "double",
      semicolons: true,
    }),
    tailwindcss(),
    react(),
    studioApi(),
  ],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    // Monaco's core is one large chunk that only the editor pages load; it cannot be split
    // further, since its services register themselves in module order.
    chunkSizeWarningLimit: 4096,
  },
});
