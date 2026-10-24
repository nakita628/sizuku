import { Link } from "@tanstack/react-router";
import { LuExternalLink } from "react-icons/lu";

/**
 * The way from a card to its page: a table's rows, or an enum's place in the docs. One click on
 * something you can see; `nodrag`/`nopan` keep React Flow from reading the press as a drag.
 */
export function OpenNodeLink({
  kind,
  name,
}: {
  readonly kind: "table" | "enum";
  readonly name: string;
}) {
  const props = {
    title: kind === "table" ? `Open the rows of ${name}` : `Open ${name} in the docs`,
    "aria-label": kind === "table" ? `Open the rows of ${name}` : `Open ${name} in the docs`,
    className: "nodrag nopan inline-flex shrink-0 opacity-60 hover:opacity-100",
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  };
  return kind === "table" ? (
    <Link to="/data/$table" params={{ table: name }} {...props}>
      <LuExternalLink size={13} />
    </Link>
  ) : (
    <Link to="/docs" hash={`enum-${name}`} {...props}>
      <LuExternalLink size={13} />
    </Link>
  );
}
