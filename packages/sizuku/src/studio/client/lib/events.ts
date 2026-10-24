import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getDbKey, getDocsKey, getSchemaQueryKey } from "../hooks/index.js";

/**
 * Follows the schema file on disk: a change made by another editor (or by a save here) refreshes
 * the snapshot, the docs and the tables. The schema editor decides itself whether to take the
 * new text, so unsaved work is never replaced behind its back.
 */
export function useSchemaFileEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource("/api/schema/events");
    source.addEventListener("change", () => {
      void queryClient.invalidateQueries({ queryKey: getSchemaQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getDocsKey() });
      void queryClient.invalidateQueries({ queryKey: getDbKey() });
    });
    return () => source.close();
  }, [queryClient]);
}
