import { Button, Label, Modal, NumberField, Switch, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  getFormatSettingsQueryKey,
  useFormatSettings,
  usePutFormatSettings,
} from "../../hooks/index.js";
import { problemMessage } from "../../lib/problem.js";
import { FORMAT_DEFAULTS } from "../../lib/settings.js";
import { useUiStore } from "../../lib/store.js";

type FormatOptions = {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: "all" | "es5" | "none";
  bracketSpacing: boolean;
  arrowParens: "always" | "avoid";
};

function Toggle({
  label,
  description,
  isSelected,
  onChange,
}: {
  readonly label: string;
  readonly description?: string;
  readonly isSelected: boolean;
  readonly onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      className="flex items-start justify-between gap-4 py-1.5"
    >
      <Switch.Content className="flex w-full items-center justify-between gap-4">
        <span className="flex flex-col">
          <Label className="text-body">{label}</Label>
          {description ? <span className="text-meta text-muted">{description}</span> : null}
        </span>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

function NumberSetting({
  label,
  value,
  min,
  max,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}) {
  // The label sits outside the field: HeroUI's NumberField stacks its own label above the input.
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-body text-ink">{label}</span>
      <NumberField
        aria-label={label}
        value={value}
        minValue={min}
        maxValue={max}
        onChange={(next) => {
          if (Number.isFinite(next)) onChange(next);
        }}
      >
        <NumberField.Group className="w-32">
          <NumberField.DecrementButton />
          <NumberField.Input className="text-center tabular-nums" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly onChange: (value: T) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-body text-ink">{label}</span>
      <select
        className="w-32 rounded-lg border border-line-strong bg-surface px-2 py-1 font-mono text-body"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h3 className="text-ui font-semibold">{title}</h3>
      <p className="mb-2 text-meta text-muted">{note}</p>
      <div className="flex flex-col divide-y divide-line">{children}</div>
    </section>
  );
}

/**
 * The studio's settings. The formatter's options belong to the project: they are written to the
 * `.oxfmtrc.json` oxfmt itself reads, so `oxfmt` on the command line formats the schema the same
 * way. The editor's are this browser's own and apply at once.
 */
export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const editor = useUiStore((s) => s.editor);
  const setEditor = useUiStore((s) => s.setEditor);
  const queryClient = useQueryClient();
  const settings = useFormatSettings({ query: { enabled: open } }).data ?? null;
  const save = usePutFormatSettings();
  const [draft, setDraft] = useState<FormatOptions>(FORMAT_DEFAULTS);

  useEffect(() => {
    if (open && settings !== null) setDraft({ ...FORMAT_DEFAULTS, ...settings.options });
  }, [open, settings]);

  const set =
    <K extends keyof FormatOptions>(key: K) =>
    (value: FormatOptions[K]) =>
      setDraft((current) => ({ ...current, [key]: value }));

  const onSave = () => {
    save.mutate(
      { json: { options: draft } },
      {
        onSuccess: (saved) => {
          void queryClient.invalidateQueries({ queryKey: getFormatSettingsQueryKey() });
          toast.success(`Saved to ${saved.configPath ?? ".oxfmtrc.json"}`);
        },
        onError: (error) => toast.danger(problemMessage(error)),
      },
    );
  };

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog aria-label="Settings">
          <Modal.Header>
            <Modal.Heading>Settings</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-6">
            <Section
              title="Formatter (oxfmt)"
              note={
                settings?.configPath ? (
                  <>
                    Read from <code className="font-mono">{settings.configPath}</code>; saving keeps
                    its other settings.
                  </>
                ) : (
                  "No .oxfmtrc.json yet: saving creates one in the working directory. Unset options use oxfmt's defaults."
                )
              }
            >
              <NumberSetting
                label="Print width"
                value={draft.printWidth}
                min={20}
                max={400}
                onChange={set("printWidth")}
              />
              <NumberSetting
                label="Tab width"
                value={draft.tabWidth}
                min={1}
                max={16}
                onChange={set("tabWidth")}
              />
              <Toggle
                label="Indent with tabs"
                isSelected={draft.useTabs}
                onChange={set("useTabs")}
              />
              <Toggle label="Semicolons" isSelected={draft.semi} onChange={set("semi")} />
              <Toggle
                label="Single quotes"
                isSelected={draft.singleQuote}
                onChange={set("singleQuote")}
              />
              <Toggle
                label="Spaces inside braces"
                isSelected={draft.bracketSpacing}
                onChange={set("bracketSpacing")}
              />
              <Choice
                label="Trailing commas"
                value={draft.trailingComma}
                options={["all", "es5", "none"]}
                onChange={set("trailingComma")}
              />
              <Choice
                label="Arrow parentheses"
                value={draft.arrowParens}
                options={["always", "avoid"]}
                onChange={set("arrowParens")}
              />
            </Section>
            <Section title="Editor" note="Kept in this browser and applied at once.">
              <NumberSetting
                label="Font size"
                value={editor.fontSize}
                min={9}
                max={32}
                onChange={(fontSize) => setEditor({ fontSize })}
              />
              <Toggle
                label="Word wrap"
                isSelected={editor.wordWrap}
                onChange={(wordWrap) => setEditor({ wordWrap })}
              />
              <Toggle
                label="Minimap"
                isSelected={editor.minimap}
                onChange={(minimap) => setEditor({ minimap })}
              />
              <Toggle
                label="Format on save"
                description="Run the formatter above before every save."
                isSelected={editor.formatOnSave}
                onChange={(formatOnSave) => setEditor({ formatOnSave })}
              />
              <Toggle
                label="Auto save"
                description="Save a second after you stop typing, while the schema parses."
                isSelected={editor.autoSave}
                onChange={(autoSave) => setEditor({ autoSave })}
              />
            </Section>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={() => setOpen(false)}>
              Close
            </Button>
            <Button onPress={onSave} isDisabled={save.isPending || settings === null}>
              Save formatter settings
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
