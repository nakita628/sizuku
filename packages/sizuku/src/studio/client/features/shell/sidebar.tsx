import { Button, Tooltip } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LuBook,
  LuDatabase,
  LuFileCode,
  LuMoon,
  LuPanelLeft,
  LuSun,
  LuTable,
  LuTerminal,
  LuZap,
} from "react-icons/lu";
import { useDb, useDbCounts, useSchema } from "../../hooks/index.js";
import { useUiStore } from "../../lib/store.js";

const NAV = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-ui";
const NAV_ACTIVE = { className: `${NAV} bg-accent-soft font-semibold text-accent-text` } as const;
const NAV_INACTIVE = { className: `${NAV} hover:bg-canvas` } as const;

const TABLE = "flex items-center gap-2 rounded-lg border px-3 py-[7px] font-mono text-body";
const TABLE_ACTIVE = {
  className: `${TABLE} border-accent bg-accent-soft font-semibold text-accent-text`,
} as const;
const TABLE_INACTIVE = { className: `${TABLE} border-transparent hover:bg-canvas` } as const;

function NavLink({
  to,
  icon,
  children,
}: {
  readonly to: "/" | "/docs" | "/query" | "/sql";
  readonly icon: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      activeProps={NAV_ACTIVE}
      inactiveProps={NAV_INACTIVE}
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </Link>
  );
}

function StatusDot({
  connected,
  failed,
}: {
  readonly connected: boolean;
  readonly failed: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${connected ? "bg-ok" : failed ? "bg-danger" : "bg-faint"}`}
    />
  );
}

/** The studio's navigation: the pages, the tables of the schema with their row counts, and the database. */
export function Sidebar() {
  const file = useSchema().data?.file ?? null;
  const db = useDb().data ?? null;
  const counts =
    useDbCounts({ query: { enabled: db?.connected === true, retry: false } }).data?.counts ?? {};
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  return (
    <aside className="flex min-h-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className="text-section">💧</span>
        <div className="min-w-0 flex-1">
          <div className="text-ui font-semibold">sizuku studio</div>
          <div className="truncate font-mono text-meta text-muted">{file ?? "…"}</div>
        </div>
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          className="text-muted"
          aria-label="Hide the sidebar"
          onPress={toggleSidebar}
        >
          <LuPanelLeft />
        </Button>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        <NavLink to="/" icon={<LuFileCode />}>
          Schema
        </NavLink>
        <NavLink to="/docs" icon={<LuBook />}>
          Docs
        </NavLink>
        <NavLink to="/query" icon={<LuZap />}>
          Query
        </NavLink>
        <NavLink to="/sql" icon={<LuTerminal />}>
          SQL
        </NavLink>
      </nav>
      <div className="mt-4 flex items-center gap-2 px-5 pb-1 text-meta font-semibold tracking-wide text-faint uppercase">
        <LuTable />
        Tables
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-2 pb-2">
        {(db?.tables ?? []).map((table) => (
          <Link
            key={table.name}
            to="/data/$table"
            params={{ table: table.name }}
            activeProps={TABLE_ACTIVE}
            inactiveProps={TABLE_INACTIVE}
          >
            <span className="flex-1 truncate">{table.name}</span>
            {counts[table.name] === undefined ? null : (
              <span className="text-meta text-faint tabular-nums">{counts[table.name]}</span>
            )}
          </Link>
        ))}
        {db !== null && db.tables.length === 0 ? (
          <p className="px-3 py-2 text-meta text-faint">No tables in the schema.</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1 border-t border-line px-3 py-2">
        <Tooltip delay={300}>
          <Tooltip.Trigger className="flex min-w-0 flex-1 items-center gap-2 text-meta text-muted">
            <LuDatabase className="shrink-0" />
            <StatusDot connected={db?.connected === true} failed={db?.error != null} />
            <span className="truncate">
              {db?.connected ? db.dialect : db?.error ? "not connected" : "no database"}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content className="max-w-80 text-meta">
            {db?.connected
              ? db.url
              : (db?.error ??
                "Start the studio with --url, or set DATABASE_URL, to browse and edit rows.")}
          </Tooltip.Content>
        </Tooltip>
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onPress={toggleTheme}
        >
          {theme === "dark" ? <LuSun /> : <LuMoon />}
        </Button>
      </div>
    </aside>
  );
}
