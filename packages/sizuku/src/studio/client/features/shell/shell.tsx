import { Button } from "@heroui/react";
import { Outlet } from "@tanstack/react-router";
import { LuPanelLeft } from "react-icons/lu";
import { useSchemaFileEvents } from "../../lib/events.js";
import { useUiStore } from "../../lib/store.js";
import { CommandPalette, PaletteButton } from "../palette/palette.js";
import { Sidebar } from "./sidebar.js";

/** The frame around every page: the sidebar and the routed page. */
export function Shell() {
  useSchemaFileEvents();
  const open = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  return (
    <div
      className={`grid h-full ${open ? "grid-cols-[240px_minmax(0,1fr)]" : "grid-cols-[40px_minmax(0,1fr)]"}`}
    >
      {open ? (
        <Sidebar />
      ) : (
        <div className="flex flex-col items-center border-r border-line bg-surface pt-3">
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            className="text-muted"
            aria-label="Show the sidebar"
            onPress={toggleSidebar}
          >
            <LuPanelLeft />
          </Button>
          <PaletteButton compact />
        </div>
      )}
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}
