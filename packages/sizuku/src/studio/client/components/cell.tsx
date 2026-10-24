type Cell = string | number | boolean | null;

/** A database value as the grids show it: NULL set apart, everything else as written. */
export function CellText({ value }: { readonly value: Cell | undefined }) {
  if (value === null || value === undefined) return <span className="text-faint italic">NULL</span>;
  if (typeof value === "boolean") return <span className="text-enum">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-key tabular-nums">{value}</span>;
  return (
    <span title={value.length > 80 ? value : undefined}>
      {value.length > 80 ? `${value.slice(0, 80)}…` : value}
    </span>
  );
}
