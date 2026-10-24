import { OpenAPIHono } from "@hono/zod-openapi";
import {
  deleteDbRowsTableNameRoute,
  getDbCountsRoute,
  getDbRoute,
  getDbRowsTableNameRoute,
  getDocsRoute,
  getFormatSettingsRoute,
  getLanguageRoute,
  getSchemaEventsRoute,
  getSchemaRoute,
  patchDbRowsTableNameRoute,
  postDbRowsTableNameRoute,
  postDbSqlRoute,
  postDiagramPngRoute,
  postDiagramSvgRoute,
  postFormatRoute,
  postLanguageCompleteDetailRoute,
  postLanguageCompleteRoute,
  postLanguageDiagnosticsRoute,
  postLanguageHoverRoute,
  postLanguageSignatureRoute,
  putFormatSettingsRoute,
  putSchemaRoute,
} from "./routes";
import {
  deleteDbRowsTableNameRouteHandler,
  getDbCountsRouteHandler,
  getDbRouteHandler,
  getDbRowsTableNameRouteHandler,
  getDocsRouteHandler,
  getFormatSettingsRouteHandler,
  getLanguageRouteHandler,
  getSchemaEventsRouteHandler,
  getSchemaRouteHandler,
  patchDbRowsTableNameRouteHandler,
  postDbRowsTableNameRouteHandler,
  postDbSqlRouteHandler,
  postDiagramPngRouteHandler,
  postDiagramSvgRouteHandler,
  postFormatRouteHandler,
  postLanguageCompleteDetailRouteHandler,
  postLanguageCompleteRouteHandler,
  postLanguageDiagnosticsRouteHandler,
  postLanguageHoverRouteHandler,
  postLanguageSignatureRouteHandler,
  putFormatSettingsRouteHandler,
  putSchemaRouteHandler,
} from "./handlers";

const app = new OpenAPIHono().basePath("/api");

export const schema = app
  .openapi(getSchemaRoute, getSchemaRouteHandler)
  .openapi(putSchemaRoute, putSchemaRouteHandler)
  .openapi(getSchemaEventsRoute, getSchemaEventsRouteHandler);

export const diagram = app
  .openapi(postDiagramSvgRoute, postDiagramSvgRouteHandler)
  .openapi(postDiagramPngRoute, postDiagramPngRouteHandler);

export const format = app
  .openapi(postFormatRoute, postFormatRouteHandler)
  .openapi(getFormatSettingsRoute, getFormatSettingsRouteHandler)
  .openapi(putFormatSettingsRoute, putFormatSettingsRouteHandler);

export const docs = app.openapi(getDocsRoute, getDocsRouteHandler);

export const db = app
  .openapi(getDbRoute, getDbRouteHandler)
  .openapi(getDbCountsRoute, getDbCountsRouteHandler)
  .openapi(getDbRowsTableNameRoute, getDbRowsTableNameRouteHandler)
  .openapi(postDbRowsTableNameRoute, postDbRowsTableNameRouteHandler)
  .openapi(patchDbRowsTableNameRoute, patchDbRowsTableNameRouteHandler)
  .openapi(deleteDbRowsTableNameRoute, deleteDbRowsTableNameRouteHandler)
  .openapi(postDbSqlRoute, postDbSqlRouteHandler);

export const language = app
  .openapi(getLanguageRoute, getLanguageRouteHandler)
  .openapi(postLanguageCompleteRoute, postLanguageCompleteRouteHandler)
  .openapi(postLanguageCompleteDetailRoute, postLanguageCompleteDetailRouteHandler)
  .openapi(postLanguageHoverRoute, postLanguageHoverRouteHandler)
  .openapi(postLanguageSignatureRoute, postLanguageSignatureRouteHandler)
  .openapi(postLanguageDiagnosticsRoute, postLanguageDiagnosticsRouteHandler);

export default app;
