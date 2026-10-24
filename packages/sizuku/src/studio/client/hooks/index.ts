import {
  useQuery,
  useSuspenseQuery,
  useMutation,
  queryOptions,
  mutationOptions,
} from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseSuspenseQueryOptions,
  UseMutationOptions,
  DefaultError,
  QueryClient,
} from "@tanstack/react-query";
import type { ClientRequestOptions, InferRequestType } from "hono/client";
import { parseResponse } from "hono/client";
import { schemaClient, diagramClient, formatClient, docsClient, dbClient } from "../api";

export function getDbKey() {
  return ["db"] as const;
}

export function getDiagramKey() {
  return ["diagram"] as const;
}

export function getDocsKey() {
  return ["docs"] as const;
}

export function getFormatKey() {
  return ["format"] as const;
}

export function getSchemaKey() {
  return ["schema"] as const;
}

export function getSchemaQueryKey() {
  return ["schema", "/schema"] as const;
}

export function getSchemaQueryOptions<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$get>>>>
  >,
  TError = DefaultError,
>(options?: ClientRequestOptions) {
  return queryOptions<
    Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$get>>>>>,
    TError,
    TData,
    ReturnType<typeof getSchemaQueryKey>
  >({
    queryKey: getSchemaQueryKey(),
    queryFn({ signal }) {
      return parseResponse(
        schemaClient.schema.$get(undefined, { ...options, init: { ...options?.init, signal } }),
      );
    },
  });
}

export function useSchema<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$get>>>>
        >,
        TError,
        TData,
        ReturnType<typeof getSchemaQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getSchemaQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseSchema<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$get>>>>
        >,
        TError,
        TData,
        ReturnType<typeof getSchemaQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getSchemaQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getPutSchemaMutationKey() {
  return ["schema", "/schema", "PUT"] as const;
}

export function getPutSchemaMutationOptions<TError = DefaultError, TOnMutateResult = unknown>(
  options?: ClientRequestOptions,
) {
  return mutationOptions<
    Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$put>>>>>,
    TError,
    InferRequestType<typeof schemaClient.schema.$put>,
    TOnMutateResult
  >({
    mutationKey: getPutSchemaMutationKey(),
    async mutationFn(args: InferRequestType<typeof schemaClient.schema.$put>) {
      return parseResponse(schemaClient.schema.$put(args, options));
    },
  });
}

export function usePutSchema<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.$put>>>>
        >,
        TError,
        InferRequestType<typeof schemaClient.schema.$put>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPutSchemaMutationOptions<TError, TOnMutateResult>(clientOptions);
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getSchemaEventsQueryKey() {
  return ["schema", "/schema/events"] as const;
}

export function getSchemaEventsQueryOptions<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.events.$get>>>>
  >,
  TError = DefaultError,
>(options?: ClientRequestOptions) {
  return queryOptions<
    Awaited<
      ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.events.$get>>>>
    >,
    TError,
    TData,
    ReturnType<typeof getSchemaEventsQueryKey>
  >({
    queryKey: getSchemaEventsQueryKey(),
    queryFn({ signal }) {
      return parseResponse(
        schemaClient.schema.events.$get(undefined, {
          ...options,
          init: { ...options?.init, signal },
        }),
      );
    },
  });
}

export function useSchemaEvents<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.events.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.events.$get>>>
          >
        >,
        TError,
        TData,
        ReturnType<typeof getSchemaEventsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getSchemaEventsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseSchemaEvents<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.events.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof schemaClient.schema.events.$get>>>
          >
        >,
        TError,
        TData,
        ReturnType<typeof getSchemaEventsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getSchemaEventsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getPostDiagramSvgMutationKey() {
  return ["diagram", "/diagram/svg", "POST"] as const;
}

export function getPostDiagramSvgMutationOptions<TError = DefaultError, TOnMutateResult = unknown>(
  options?: ClientRequestOptions,
) {
  return mutationOptions<
    Awaited<
      ReturnType<typeof parseResponse<Awaited<ReturnType<typeof diagramClient.diagram.svg.$post>>>>
    >,
    TError,
    InferRequestType<typeof diagramClient.diagram.svg.$post>,
    TOnMutateResult
  >({
    mutationKey: getPostDiagramSvgMutationKey(),
    async mutationFn(args: InferRequestType<typeof diagramClient.diagram.svg.$post>) {
      return parseResponse(diagramClient.diagram.svg.$post(args, options));
    },
  });
}

export function usePostDiagramSvg<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof diagramClient.diagram.svg.$post>>>
          >
        >,
        TError,
        InferRequestType<typeof diagramClient.diagram.svg.$post>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPostDiagramSvgMutationOptions<TError, TOnMutateResult>(clientOptions);
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getPostDiagramPngMutationKey() {
  return ["diagram", "/diagram/png", "POST"] as const;
}

export function getPostDiagramPngMutationOptions<TError = DefaultError, TOnMutateResult = unknown>(
  options?: ClientRequestOptions,
) {
  return mutationOptions<
    Awaited<
      ReturnType<typeof parseResponse<Awaited<ReturnType<typeof diagramClient.diagram.png.$post>>>>
    >,
    TError,
    InferRequestType<typeof diagramClient.diagram.png.$post>,
    TOnMutateResult
  >({
    mutationKey: getPostDiagramPngMutationKey(),
    async mutationFn(args: InferRequestType<typeof diagramClient.diagram.png.$post>) {
      return parseResponse(diagramClient.diagram.png.$post(args, options));
    },
  });
}

export function usePostDiagramPng<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof diagramClient.diagram.png.$post>>>
          >
        >,
        TError,
        InferRequestType<typeof diagramClient.diagram.png.$post>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPostDiagramPngMutationOptions<TError, TOnMutateResult>(clientOptions);
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getPostFormatMutationKey() {
  return ["format", "/format", "POST"] as const;
}

export function getPostFormatMutationOptions<TError = DefaultError, TOnMutateResult = unknown>(
  options?: ClientRequestOptions,
) {
  return mutationOptions<
    Awaited<
      ReturnType<typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.$post>>>>
    >,
    TError,
    InferRequestType<typeof formatClient.format.$post>,
    TOnMutateResult
  >({
    mutationKey: getPostFormatMutationKey(),
    async mutationFn(args: InferRequestType<typeof formatClient.format.$post>) {
      return parseResponse(formatClient.format.$post(args, options));
    },
  });
}

export function usePostFormat<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.$post>>>>
        >,
        TError,
        InferRequestType<typeof formatClient.format.$post>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPostFormatMutationOptions<TError, TOnMutateResult>(clientOptions);
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getFormatSettingsQueryKey() {
  return ["format", "/format/settings"] as const;
}

export function getFormatSettingsQueryOptions<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$get>>>>
  >,
  TError = DefaultError,
>(options?: ClientRequestOptions) {
  return queryOptions<
    Awaited<
      ReturnType<
        typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$get>>>
      >
    >,
    TError,
    TData,
    ReturnType<typeof getFormatSettingsQueryKey>
  >({
    queryKey: getFormatSettingsQueryKey(),
    queryFn({ signal }) {
      return parseResponse(
        formatClient.format.settings.$get(undefined, {
          ...options,
          init: { ...options?.init, signal },
        }),
      );
    },
  });
}

export function useFormatSettings<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$get>>>
          >
        >,
        TError,
        TData,
        ReturnType<typeof getFormatSettingsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getFormatSettingsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseFormatSettings<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$get>>>
          >
        >,
        TError,
        TData,
        ReturnType<typeof getFormatSettingsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getFormatSettingsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getPutFormatSettingsMutationKey() {
  return ["format", "/format/settings", "PUT"] as const;
}

export function getPutFormatSettingsMutationOptions<
  TError = DefaultError,
  TOnMutateResult = unknown,
>(options?: ClientRequestOptions) {
  return mutationOptions<
    Awaited<
      ReturnType<
        typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$put>>>
      >
    >,
    TError,
    InferRequestType<typeof formatClient.format.settings.$put>,
    TOnMutateResult
  >({
    mutationKey: getPutFormatSettingsMutationKey(),
    async mutationFn(args: InferRequestType<typeof formatClient.format.settings.$put>) {
      return parseResponse(formatClient.format.settings.$put(args, options));
    },
  });
}

export function usePutFormatSettings<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<Awaited<ReturnType<typeof formatClient.format.settings.$put>>>
          >
        >,
        TError,
        InferRequestType<typeof formatClient.format.settings.$put>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPutFormatSettingsMutationOptions<TError, TOnMutateResult>(
    clientOptions,
  );
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getDocsQueryKey() {
  return ["docs", "/docs"] as const;
}

export function getDocsQueryOptions<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof docsClient.docs.$get>>>>
  >,
  TError = DefaultError,
>(options?: ClientRequestOptions) {
  return queryOptions<
    Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof docsClient.docs.$get>>>>>,
    TError,
    TData,
    ReturnType<typeof getDocsQueryKey>
  >({
    queryKey: getDocsQueryKey(),
    queryFn({ signal }) {
      return parseResponse(
        docsClient.docs.$get(undefined, { ...options, init: { ...options?.init, signal } }),
      );
    },
  });
}

export function useDocs<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof docsClient.docs.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof docsClient.docs.$get>>>>>,
        TError,
        TData,
        ReturnType<typeof getDocsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getDocsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseDocs<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof docsClient.docs.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof docsClient.docs.$get>>>>>,
        TError,
        TData,
        ReturnType<typeof getDocsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getDocsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getDbQueryKey() {
  return ["db", "/db"] as const;
}

export function getDbQueryOptions<
  TData = Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.$get>>>>>,
  TError = DefaultError,
>(options?: ClientRequestOptions) {
  return queryOptions<
    Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.$get>>>>>,
    TError,
    TData,
    ReturnType<typeof getDbQueryKey>
  >({
    queryKey: getDbQueryKey(),
    queryFn({ signal }) {
      return parseResponse(
        dbClient.db.$get(undefined, { ...options, init: { ...options?.init, signal } }),
      );
    },
  });
}

export function useDb<
  TData = Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.$get>>>>>,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.$get>>>>>,
        TError,
        TData,
        ReturnType<typeof getDbQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getDbQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseDb<
  TData = Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.$get>>>>>,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.$get>>>>>,
        TError,
        TData,
        ReturnType<typeof getDbQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getDbQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getDbCountsQueryKey() {
  return ["db", "/db/counts"] as const;
}

export function getDbCountsQueryOptions<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.counts.$get>>>>
  >,
  TError = DefaultError,
>(options?: ClientRequestOptions) {
  return queryOptions<
    Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.counts.$get>>>>>,
    TError,
    TData,
    ReturnType<typeof getDbCountsQueryKey>
  >({
    queryKey: getDbCountsQueryKey(),
    queryFn({ signal }) {
      return parseResponse(
        dbClient.db.counts.$get(undefined, { ...options, init: { ...options?.init, signal } }),
      );
    },
  });
}

export function useDbCounts<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.counts.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.counts.$get>>>>
        >,
        TError,
        TData,
        ReturnType<typeof getDbCountsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getDbCountsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseDbCounts<
  TData = Awaited<
    ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.counts.$get>>>>
  >,
  TError = DefaultError,
>(
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.counts.$get>>>>
        >,
        TError,
        TData,
        ReturnType<typeof getDbCountsQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getDbCountsQueryOptions<TData, TError>(clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getDbRowsTableNameQueryKey(
  args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$get"]>,
) {
  return ["db", "/db/rows/:tableName", args] as const;
}

export function getDbRowsTableNameQueryOptions<
  TData = Awaited<
    ReturnType<
      typeof parseResponse<Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$get"]>>>
    >
  >,
  TError = DefaultError,
>(
  args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$get"]>,
  options?: ClientRequestOptions,
) {
  return queryOptions<
    Awaited<
      ReturnType<
        typeof parseResponse<Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$get"]>>>
      >
    >,
    TError,
    TData,
    ReturnType<typeof getDbRowsTableNameQueryKey>
  >({
    queryKey: getDbRowsTableNameQueryKey(args),
    queryFn({ signal }) {
      return parseResponse(
        dbClient.db.rows[":tableName"].$get(args, {
          ...options,
          init: { ...options?.init, signal },
        }),
      );
    },
  });
}

export function useDbRowsTableName<
  TData = Awaited<
    ReturnType<
      typeof parseResponse<Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$get"]>>>
    >
  >,
  TError = DefaultError,
>(
  args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$get"]>,
  options?: {
    query?: Omit<
      UseQueryOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<
              Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$get"]>>
            >
          >
        >,
        TError,
        TData,
        ReturnType<typeof getDbRowsTableNameQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useQuery(
    { ...getDbRowsTableNameQueryOptions<TData, TError>(args, clientOptions), ...queryOptions },
    queryClient,
  );
}

export function useSuspenseDbRowsTableName<
  TData = Awaited<
    ReturnType<
      typeof parseResponse<Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$get"]>>>
    >
  >,
  TError = DefaultError,
>(
  args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$get"]>,
  options?: {
    query?: Omit<
      UseSuspenseQueryOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<
              Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$get"]>>
            >
          >
        >,
        TError,
        TData,
        ReturnType<typeof getDbRowsTableNameQueryKey>
      >,
      "queryKey" | "queryFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { query: queryOptions, options: clientOptions } = options ?? {};
  return useSuspenseQuery(
    { ...getDbRowsTableNameQueryOptions<TData, TError>(args, clientOptions), ...queryOptions },
    queryClient,
  );
}

export function getPostDbRowsTableNameMutationKey() {
  return ["db", "/db/rows/:tableName", "POST"] as const;
}

export function getPostDbRowsTableNameMutationOptions<
  TError = DefaultError,
  TOnMutateResult = unknown,
>(options?: ClientRequestOptions) {
  return mutationOptions<
    Awaited<
      ReturnType<
        typeof parseResponse<Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$post"]>>>
      >
    >,
    TError,
    InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$post"]>,
    TOnMutateResult
  >({
    mutationKey: getPostDbRowsTableNameMutationKey(),
    async mutationFn(args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$post"]>) {
      return parseResponse(dbClient.db.rows[":tableName"].$post(args, options));
    },
  });
}

export function usePostDbRowsTableName<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<
              Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$post"]>>
            >
          >
        >,
        TError,
        InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$post"]>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPostDbRowsTableNameMutationOptions<TError, TOnMutateResult>(
    clientOptions,
  );
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getDeleteDbRowsTableNameMutationKey() {
  return ["db", "/db/rows/:tableName", "DELETE"] as const;
}

export function getDeleteDbRowsTableNameMutationOptions<
  TError = DefaultError,
  TOnMutateResult = unknown,
>(options?: ClientRequestOptions) {
  return mutationOptions<
    Awaited<
      ReturnType<
        typeof parseResponse<
          Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$delete"]>>
        >
      >
    >,
    TError,
    InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$delete"]>,
    TOnMutateResult
  >({
    mutationKey: getDeleteDbRowsTableNameMutationKey(),
    async mutationFn(args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$delete"]>) {
      return parseResponse(dbClient.db.rows[":tableName"].$delete(args, options));
    },
  });
}

export function useDeleteDbRowsTableName<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<
              Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$delete"]>>
            >
          >
        >,
        TError,
        InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$delete"]>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getDeleteDbRowsTableNameMutationOptions<TError, TOnMutateResult>(
    clientOptions,
  );
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getPatchDbRowsTableNameMutationKey() {
  return ["db", "/db/rows/:tableName", "PATCH"] as const;
}

export function getPatchDbRowsTableNameMutationOptions<
  TError = DefaultError,
  TOnMutateResult = unknown,
>(options?: ClientRequestOptions) {
  return mutationOptions<
    Awaited<
      ReturnType<
        typeof parseResponse<Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$patch"]>>>
      >
    >,
    TError,
    InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$patch"]>,
    TOnMutateResult
  >({
    mutationKey: getPatchDbRowsTableNameMutationKey(),
    async mutationFn(args: InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$patch"]>) {
      return parseResponse(dbClient.db.rows[":tableName"].$patch(args, options));
    },
  });
}

export function usePatchDbRowsTableName<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<
            typeof parseResponse<
              Awaited<ReturnType<(typeof dbClient.db.rows)[":tableName"]["$patch"]>>
            >
          >
        >,
        TError,
        InferRequestType<(typeof dbClient.db.rows)[":tableName"]["$patch"]>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPatchDbRowsTableNameMutationOptions<TError, TOnMutateResult>(
    clientOptions,
  );
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}

export function getPostDbSqlMutationKey() {
  return ["db", "/db/sql", "POST"] as const;
}

export function getPostDbSqlMutationOptions<TError = DefaultError, TOnMutateResult = unknown>(
  options?: ClientRequestOptions,
) {
  return mutationOptions<
    Awaited<ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.sql.$post>>>>>,
    TError,
    InferRequestType<typeof dbClient.db.sql.$post>,
    TOnMutateResult
  >({
    mutationKey: getPostDbSqlMutationKey(),
    async mutationFn(args: InferRequestType<typeof dbClient.db.sql.$post>) {
      return parseResponse(dbClient.db.sql.$post(args, options));
    },
  });
}

export function usePostDbSql<TError = DefaultError, TOnMutateResult = unknown>(
  options?: {
    mutation?: Omit<
      UseMutationOptions<
        Awaited<
          ReturnType<typeof parseResponse<Awaited<ReturnType<typeof dbClient.db.sql.$post>>>>
        >,
        TError,
        InferRequestType<typeof dbClient.db.sql.$post>,
        TOnMutateResult
      >,
      "mutationFn"
    >;
    options?: ClientRequestOptions;
  },
  queryClient?: QueryClient,
) {
  const { mutation: mutationOptions, options: clientOptions } = options ?? {};
  const mutationDefaults = getPostDbSqlMutationOptions<TError, TOnMutateResult>(clientOptions);
  return useMutation(
    {
      ...mutationOptions,
      ...mutationDefaults,
      mutationKey: mutationOptions?.mutationKey ?? mutationDefaults.mutationKey,
    },
    queryClient,
  );
}
