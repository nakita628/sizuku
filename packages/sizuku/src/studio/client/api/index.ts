import { hc } from "hono/client";
import type { schema, diagram, format, docs, db } from "../../server/index";

type SchemaClient = ReturnType<typeof hc<typeof schema>>;

const hcSchemaWithType = (...args: Parameters<typeof hc>): SchemaClient =>
  hc<typeof schema>(...args);

export const schemaClient = hcSchemaWithType("/").api;

type DiagramClient = ReturnType<typeof hc<typeof diagram>>;

const hcDiagramWithType = (...args: Parameters<typeof hc>): DiagramClient =>
  hc<typeof diagram>(...args);

export const diagramClient = hcDiagramWithType("/").api;

type FormatClient = ReturnType<typeof hc<typeof format>>;

const hcFormatWithType = (...args: Parameters<typeof hc>): FormatClient =>
  hc<typeof format>(...args);

export const formatClient = hcFormatWithType("/").api;

type DocsClient = ReturnType<typeof hc<typeof docs>>;

const hcDocsWithType = (...args: Parameters<typeof hc>): DocsClient => hc<typeof docs>(...args);

export const docsClient = hcDocsWithType("/").api;

type DbClient = ReturnType<typeof hc<typeof db>>;

const hcDbWithType = (...args: Parameters<typeof hc>): DbClient => hc<typeof db>(...args);

export const dbClient = hcDbWithType("/").api;
