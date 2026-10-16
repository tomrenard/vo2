import Link from "next/link";

/** Line icons (24px, stroke = currentColor), so the active tab simply takes the accent. */
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

export function TabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      className="line fixed inset-x-0 bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)]"
      style={{ background: "var(--surface)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4 px-3 pt-2 pb-1">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              prefetch
              aria-current={tab.href === active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-1 text-xs font-semibold ${
                tab.href === active ? "text-[var(--brand)]" : "muted"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={tab.href === active ? 2.1 : 1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={ICONS[tab.href]} />
              </svg>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
