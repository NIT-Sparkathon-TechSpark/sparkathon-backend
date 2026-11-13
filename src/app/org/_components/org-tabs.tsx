import Link from "next/link";
import { cn } from "@/lib/utils";

/** The tab bar shared by the dashboard and the organization's results, styled like /results. */
export function OrgTabs({ slug, active }: { slug: string; active: "dashboard" | "results" }) {
  const tabs = [
    { key: "dashboard", href: `/org/${slug}`, label: "Dashboard" },
    { key: "results", href: `/org/${slug}/results`, label: "Results" },
  ] as const;
  return (
    <nav aria-label="Organization views" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            tab.key === active
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
