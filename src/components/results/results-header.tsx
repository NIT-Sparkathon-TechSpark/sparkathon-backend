import Link from "next/link";
import { KINDS, KIND_NAMES, SETS, SET_NAMES, filterQuery, type ResultsFilter } from "@/app/results/_lib/filters";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";
import { FilterMenu, FilterSwitch } from "./filter-menu";
import type { FactsProblem, FactsSource } from "@/app/results/_lib/load-facts";
import { DataSourceNotice } from "./notices";

/**
 * The results come from two separate studies, so the first choice is which study to look at.
 * The experiment has its own set and its own people; it never reads as a fourth view of the main one.
 */
const STUDIES = [
  {
    name: "Main study",
    href: "/results",
    tabs: [
      { href: "/results", label: "Overview" },
      { href: "/results/breakdowns", label: "Helps or hurts" },
      { href: "/results/confidence", label: "Confidence" },
    ],
  },
  {
    name: "AI-first experiment",
    href: "/results/advice-first",
    tabs: [{ href: "/results/advice-first", label: "AI shown first" }],
  },
] as const;

type Tab = (typeof STUDIES)[number]["tabs"][number]["href"];

function studyOf(active: Tab) {
  return STUDIES.find((study) => study.tabs.some((tab) => tab.href === active)) ?? STUDIES[0];
}

/**
 * Which study the screen is about. A small segmented switch, deliberately unlike the filter chips
 * below it, so "which study" and "which slice of it" never look like the same control.
 * `query` carries the filters when going back to the main study.
 */
export function StudySwitch({ active, query = "" }: { active: Tab; query?: string }) {
  const current = studyOf(active);
  return (
    <nav aria-label="Study" className="bg-muted inline-flex w-fit max-w-full rounded-full p-1">
      {STUDIES.map((study) => {
        const selected = study === current;
        return (
          <Link
            key={study.name}
            href={study.href === "/results" ? `${study.href}${query}` : study.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              selected
                ? "bg-background text-foreground ring-foreground/10 shadow-sm ring-1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {study.name}
          </Link>
        );
      })}
    </nav>
  );
}

/** The views of the chosen study. Nothing shows when the study has only one view. */
export function ViewTabs({ active, query = "" }: { active: Tab; query?: string }) {
  const { tabs } = studyOf(active);
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Views" className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={`${tab.href}${query}`}
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
    </nav>
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
      <StudySwitch active={active} query={filterQuery(filter)} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            When does AI advice make people worse?
          </h1>
        </div>
        <AutoRefresh />
      </div>

      <ViewTabs active={active} query={filterQuery(filter)} />

      {/* Which answers the numbers are built from: every kind, one kind, or one set. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="group" aria-label="Kind of question" className="flex flex-wrap items-center gap-2">
          <Chip href={`${active}${filterQuery({ ...filter, set: null, kind: null }, extra)}`} active={!filter.set && !filter.kind}>
            All questions
          </Chip>
          {KINDS.map((kind) => (
            <Chip
              key={kind}
              href={`${active}${filterQuery({ ...filter, set: null, kind }, extra)}`}
              active={!filter.set && filter.kind === kind}
            >
              {KIND_NAMES[kind]}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <FilterMenu
            label="Set"
            align="end"
            options={[
              { href: `${active}${filterQuery({ ...filter, set: null }, extra)}`, label: "Any", active: filter.set === null },
              ...SETS.map((set) => ({
                href: `${active}${filterQuery({ ...filter, set, kind: null }, extra)}`,
                label: SET_NAMES[set],
                active: filter.set === set,
              })),
            ]}
          />
          <FilterSwitch
            href={`${active}${filterQuery({ ...filter, seeded: !filter.seeded }, extra)}`}
            on={filter.seeded}
            label="Simulated sessions"
          />
        </div>
      </div>

      <DataSourceNotice source={source} problem={problem} />
    </header>
  );
}

/** One choice in a row of filters. A plain link, like every other filter here. */
function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-9 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card/70 text-muted-foreground hover:text-foreground ring-1 ring-foreground/10",
      )}
    >
      {children}
    </Link>
  );
}
