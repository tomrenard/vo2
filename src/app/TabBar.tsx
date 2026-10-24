import { Dock } from "./Dock";

/** Line icons (24px, stroke = currentColor). */
const ICONS = {
  "/": "M13 2 4 14h7l-1 8 9-12h-7z",
  "/map": "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  "/papers": "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  "/library": "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7",
} as const;

const TABS = [
  { href: "/", label: "Study" },
  { href: "/map", label: "Map" },
  { href: "/papers", label: "Papers" },
  { href: "/library", label: "Library" },
] as const;

/** Bottom navigation of the main screens; `active` is the current tab's href. */
export function TabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <Dock
      active={active}
      label="Sections"
      tabs={TABS.map((tab) => ({ ...tab, icon: ICONS[tab.href] }))}
    />
  );
}
