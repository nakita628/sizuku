import { Button, Checkbox, Label, Modal } from "@heroui/react";
import { useEffect, useState } from "react";

type Cell = string | number | boolean | null;
type Row = Readonly<Record<string, Cell>>;
type Column = {
  readonly name: string;
  readonly column: string;
  readonly type: string;
  readonly nullable: boolean;
};

const NUMERIC =
  /^(int|integer|smallint|bigint|serial|smallserial|bigserial|real|double|doublePrecision|float|numeric|decimal|tinyint|mediumint)$/iu;

/** What a typed value is sent as: a number for a numeric column when it reads as one, else the text. */
export function parseCell(column: Column, text: string): Cell {
  if (column.type === "boolean") return text === "true" ? true : text === "false" ? false : text;
  if (NUMERIC.test(column.type) && text.trim() !== "" && Number.isFinite(Number(text)))
    return Number(text);
  return text;
}

function display(value: Cell | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

type Field = { readonly text: string; readonly isNull: boolean; readonly touched: boolean };

/**
 * A row to add or change. Adding sends only the fields that were filled in, so the database
 * fills in the rest from its defaults; changing sends only the fields that were changed.
 */
export function RowDialog({
  isOpen,
  title,
  columns,
  row,
  isPending,
  onSubmit,
  onOpenChange,
}: {
  readonly isOpen: boolean;
  readonly title: string;
  readonly columns: readonly Column[];
  /** The row being changed, or null to add one. */
  readonly row: Row | null;
  readonly isPending: boolean;
  readonly onSubmit: (values: Record<string, Cell>) => void;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [fields, setFields] = useState<Record<string, Field>>({});

  useEffect(() => {
    if (!isOpen) return;
    setFields(
      Object.fromEntries(
        columns.map((column) => {
          const value = row?.[column.name];
          return [
            column.name,
            { text: display(value), isNull: row !== null && value === null, touched: false },
          ];
        }),
      ),
    );
  }, [isOpen, row, columns]);

  const update = (name: string, patch: Partial<Field>) =>
    setFields((current) => ({
      ...current,
      [name]: { ...current[name]!, ...patch, touched: true },
    }));

  const submit = () => {
    const values = Object.fromEntries(
      columns.flatMap((column) => {
        const field = fields[column.name];
        if (field === undefined) return [];
        if (row === null && !field.touched && field.text === "") return [];
        if (row !== null && !field.touched) return [];
        return [[column.name, field.isNull ? null : parseCell(column, field.text)]];
      }),
    );
    onSubmit(values);
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog aria-label={title}>
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-3">
            {row === null ? (
              <p className="text-meta text-muted">
                Leave a field empty to let the database use its default.
              </p>
            ) : null}
            {columns.map((column) => {
              const field = fields[column.name] ?? { text: "", isNull: false, touched: false };
              return (
                <div key={column.name} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`field-${column.name}`}
                      className="font-mono text-body font-semibold"
                    >
                      {column.name}
                    </Label>
                    <span className="font-mono text-meta text-faint">{column.type}</span>
                    <span className="flex-1" />
                    {column.nullable ? (
                      <Checkbox
                        isSelected={field.isNull}
                        onChange={(isNull) => update(column.name, { isNull })}
                      >
                        <Checkbox.Content className="flex items-center gap-1.5">
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Label className="text-meta">NULL</Label>
                        </Checkbox.Content>
                      </Checkbox>
                    ) : null}
                  </div>
                  <input
                    id={`field-${column.name}`}
                    className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-body disabled:opacity-50"
                    value={field.text}
                    disabled={field.isNull}
                    placeholder={column.type === "boolean" ? "true / false" : ""}
                    onChange={(event) => update(column.name, { text: event.target.value })}
                  />
                </div>
              );
            })}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onPress={submit} isDisabled={isPending}>
              {row === null ? "Add row" : "Save row"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
