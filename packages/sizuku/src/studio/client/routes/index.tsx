import { createFileRoute } from "@tanstack/react-router";
import { SchemaView } from "../features/schema/schema-view.js";

export const Route = createFileRoute("/")({ component: SchemaView });
