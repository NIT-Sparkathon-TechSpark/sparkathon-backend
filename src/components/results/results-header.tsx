import Link from "next/link";
import { SETS, SET_NAMES, filterQuery, type ResultsFilter } from "@/app/results/_lib/filters";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";
import type { FactsProblem, FactsSource } from "@/app/results/_lib/load-facts";
import { DataSourceNotice } from "./notices";

const TABS = [
  { href: "/results", label: "Overview" },
  { href: "/results/breakdowns", label: "Helps or hurts" },
  { href: "/results/confidence", label: "Confidence" },
] as const;

type Tab = (typeof TABS)[number]["href"];

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Title, tab bar and filters shared by the results screens. Filters are plain links, so they
 * work without JavaScript and every view has a shareable URL.
 */
export function ResultsHeader({
  active,
  filter,
  extra = {},
  trials,
  sessions,
  source,
  problem,
}: {
  active: Tab;
  filter: ResultsFilter;
  /** Page-specific parameters to keep when a filter changes (e.g. the breakdown dimension). */
  extra?: Record<string, string | null>;
  trials: number;
  sessions: number;
  source: FactsSource;
  problem?: FactsProblem;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            The Centaur Test
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            When does AI advice make people worse?
          </h1>
          <p className="text-muted-foreground text-sm">
            {trials} answers from {sessions} {sessions === 1 ? "session" : "sessions"}
            {filter.set ? ` · ${SET_NAMES[filter.set]}` : " · all sets"}
            {filter.seeded ? " · includes seeded sessions" : " · live sessions only"}
          </p>
        </div>
        <AutoRefresh />
      </div>

      <nav aria-label="Results views" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`${tab.href}${filterQuery(filter)}`}
            aria-current={tab.href === active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              tab.href === active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </Link>
        ))}
        <Link
          href={`/live${filterQuery(filter)}`}
          className="text-muted-foreground hover:text-foreground ml-auto px-3 py-2 text-sm font-medium whitespace-nowrap"
        >
          Projector view ↗
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground mr-1 text-xs">Set</span>
        <Chip href={`${active}${filterQuery({ ...filter, set: null }, extra)}`} active={filter.set === null}>
          All
        </Chip>
        {SETS.map((set) => (
          <Chip key={set} href={`${active}${filterQuery({ ...filter, set }, extra)}`} active={filter.set === set}>
            {SET_NAMES[set]}
          </Chip>
        ))}
        <span className="bg-border mx-2 h-4 w-px" />
        <Chip
          href={`${active}${filterQuery({ ...filter, seeded: !filter.seeded }, extra)}`}
          active={filter.seeded}
        >
          {filter.seeded ? "✓ " : ""}Seeded sessions
        </Chip>
      </div>

      <DataSourceNotice source={source} problem={problem} />
    </header>
  );
}
