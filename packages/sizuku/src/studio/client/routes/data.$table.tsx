import { createFileRoute } from "@tanstack/react-router";
import { TableView } from "../features/data/table-view.js";

export const Route = createFileRoute("/data/$table")({ component: Page });

function Page() {
  const { table } = Route.useParams();
  // Keyed on the table, so the page and the dialogs start over when another table is opened.
  return <TableView key={table} tableName={table} />;
}
