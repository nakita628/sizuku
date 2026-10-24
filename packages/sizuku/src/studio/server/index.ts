import { OpenAPIHono } from "@hono/zod-openapi";
import {
  deleteDbRowsTableNameRoute,
  getDbCountsRoute,
  getDbRoute,
  getDbRowsTableNameRoute,
  getDocsRoute,
  getLanguageRoute,
  getSchemaEventsRoute,
  getSchemaRoute,
  patchDbRowsTableNameRoute,
  postDbAnalyzeRoute,
  postDbExplainRoute,
  postDbRowsTableNameRoute,
  postDbSqlRoute,
  postDiagramPngRoute,
  postDiagramSchemaRoute,
  postDiagramSvgRoute,
  postDrizzleRoute,
  postDrizzleTouchedRoute,
  postFormatRoute,
  postLanguageCompleteDetailRoute,
  postLanguageCompleteRoute,
  postLanguageDiagnosticsRoute,
  postLanguageHoverRoute,
  postLanguageSignatureRoute,
  putSchemaRoute,
} from "./routes";
import {
  deleteDbRowsTableNameRouteHandler,
  getDbCountsRouteHandler,
  getDbRouteHandler,
  getDbRowsTableNameRouteHandler,
  getDocsRouteHandler,
  getLanguageRouteHandler,
  getSchemaEventsRouteHandler,
  getSchemaRouteHandler,
  patchDbRowsTableNameRouteHandler,
  postDbAnalyzeRouteHandler,
  postDbExplainRouteHandler,
  postDbRowsTableNameRouteHandler,
  postDbSqlRouteHandler,
  postDiagramPngRouteHandler,
  postDiagramSchemaRouteHandler,
  postDiagramSvgRouteHandler,
  postDrizzleRouteHandler,
  postDrizzleTouchedRouteHandler,
  postFormatRouteHandler,
  postLanguageCompleteDetailRouteHandler,
  postLanguageCompleteRouteHandler,
  postLanguageDiagnosticsRouteHandler,
  postLanguageHoverRouteHandler,
  postLanguageSignatureRouteHandler,
  putSchemaRouteHandler,
} from "./handlers";

const app = new OpenAPIHono().basePath("/api");

export const schema = app
  .openapi(getSchemaRoute, getSchemaRouteHandler)
  .openapi(putSchemaRoute, putSchemaRouteHandler)
  .openapi(getSchemaEventsRoute, getSchemaEventsRouteHandler);

export const diagram = app
  .openapi(postDiagramSchemaRoute, postDiagramSchemaRouteHandler)
  .openapi(postDiagramSvgRoute, postDiagramSvgRouteHandler)
  .openapi(postDiagramPngRoute, postDiagramPngRouteHandler);

export const format = app.openapi(postFormatRoute, postFormatRouteHandler);

export const docs = app.openapi(getDocsRoute, getDocsRouteHandler);

export const db = app
  .openapi(getDbRoute, getDbRouteHandler)
  .openapi(getDbCountsRoute, getDbCountsRouteHandler)
  .openapi(getDbRowsTableNameRoute, getDbRowsTableNameRouteHandler)
  .openapi(postDbRowsTableNameRoute, postDbRowsTableNameRouteHandler)
  .openapi(patchDbRowsTableNameRoute, patchDbRowsTableNameRouteHandler)
  .openapi(deleteDbRowsTableNameRoute, deleteDbRowsTableNameRouteHandler)
  .openapi(postDbSqlRoute, postDbSqlRouteHandler)
  .openapi(postDbExplainRoute, postDbExplainRouteHandler)
  .openapi(postDbAnalyzeRoute, postDbAnalyzeRouteHandler);

export const language = app
  .openapi(getLanguageRoute, getLanguageRouteHandler)
  .openapi(postLanguageCompleteRoute, postLanguageCompleteRouteHandler)
  .openapi(postLanguageCompleteDetailRoute, postLanguageCompleteDetailRouteHandler)
  .openapi(postLanguageHoverRoute, postLanguageHoverRouteHandler)
  .openapi(postLanguageSignatureRoute, postLanguageSignatureRouteHandler)
  .openapi(postLanguageDiagnosticsRoute, postLanguageDiagnosticsRouteHandler);

export const drizzle = app
  .openapi(postDrizzleRoute, postDrizzleRouteHandler)
  .openapi(postDrizzleTouchedRoute, postDrizzleTouchedRouteHandler);

export default app;
