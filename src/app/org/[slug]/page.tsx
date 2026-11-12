import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutOrgAction } from "@/actions/org";
import { Eyebrow } from "@/app/(participant)/_components/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OrgSetSummary } from "@/db/queries/orgs";
import { requireOrg } from "@/lib/org-auth";
import { cn } from "@/lib/utils";
import { CopyLink, UploadForm } from "../_components/forms";
import { OrgTabs } from "../_components/org-tabs";

export const metadata: Metadata = { title: "Dashboard · The Centaur Test", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** An organization's private sets, their participant links, and the upload (docs/plan/org-accounts.md). */
export default async function OrgDashboard({ params }: PageProps<"/org/[slug]">) {
  const { slug } = await params;
  const org = await requireOrg(slug);

  let sets: OrgSetSummary[] | null = null;
  try {
    const { listOrgSets } = await import("@/db/queries/orgs");
    sets = await listOrgSets(org.id);
  } catch (error) {
    console.error("[org] listOrgSets failed", { org: org.slug, error });
  }

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";

  const finished = sets?.reduce((sum, s) => sum + s.completedSessions, 0) ?? 0;

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Eyebrow className="text-primary">Organization · {org.slug}</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{org.name}</h1>
            {sets && (
              <p className="text-muted-foreground text-sm">
                {sets.length} question {sets.length === 1 ? "set" : "sets"} · {finished} finished{" "}
                {finished === 1 ? "session" : "sessions"}
              </p>
            )}
          </div>
          <form action={signOutOrgAction}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>

        <OrgTabs slug={org.slug} active="dashboard" />
      </header>

      <section aria-labelledby="sets-heading" className="flex flex-col gap-4">
        <h2 id="sets-heading" className="text-xl font-semibold tracking-tight">
          Your question sets
        </h2>
        {sets === null ? (
          <p className="border-hurts/40 bg-hurts-soft rounded-2xl border p-5 text-sm">
            Your sets could not be loaded. If this is a new database, the organization tables may not be set up yet
            (run <code>pnpm db:migrate</code>).
          </p>
        ) : sets.length === 0 ? (
          <p className="bg-card/70 text-muted-foreground rounded-2xl border border-dashed p-6 text-sm backdrop-blur">
            No sets yet. Upload your first one below.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sets.map((set) => (
              <SetCard key={set.slug} set={set} origin={origin} orgSlug={org.slug} />
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="upload-heading"
        className="bg-card/70 flex flex-col gap-6 rounded-2xl border p-6 backdrop-blur md:p-8"
      >
        <div className="flex max-w-2xl flex-col gap-2">
          <Eyebrow className="text-primary">Add a set</Eyebrow>
          <h2 id="upload-heading" className="text-2xl leading-tight font-semibold tracking-tight">
            Upload cases from your own work
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            One row per question: the case, four options, the correct one, and what your AI answered and why. Include
            cases where your AI was wrong, about a third, or over-reliance can&apos;t be measured.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
          <UploadForm />
          <FormatHelp />
        </div>
      </section>
    </>
  );
}

function SetCard({ set, origin, orgSlug }: { set: OrgSetSummary; origin: string; orgSlug: string }) {
  const link = `${origin}/t/${set.shareToken}`;
  return (
    <article className="bg-card/70 flex min-w-0 flex-col gap-5 rounded-2xl border p-5 backdrop-blur sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{set.name}</h3>
        {set.description && <p className="text-muted-foreground text-sm leading-relaxed">{set.description}</p>}
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Questions">{set.tasks}</Stat>
        <Stat label="AI wrong" ai>
          {set.aiWrong}
        </Stat>
        <Stat label="Finished" note={`of ${set.startedSessions} started`}>
          {set.completedSessions}
        </Stat>
      </dl>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">Participant link</p>
        <CopyLink url={link} />
        <p className="text-muted-foreground text-xs">Anyone with this link can take the test, so share it only with your team.</p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <a href={`/t/${set.shareToken}?label=practice`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Try it yourself (not counted)
        </a>
        <Link href={`/org/${orgSlug}/results?set=${set.slug}`} className={buttonVariants({ size: "sm" })}>
          Results for this set
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, ai, note, children }: { label: string; ai?: boolean; note?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border p-3">
      <dt className="text-muted-foreground truncate text-[0.6875rem] font-semibold tracking-wide uppercase sm:text-xs">
        {label}
      </dt>
      <dd className={cn("text-xl font-semibold tabular-nums", ai && "text-ai")}>{children}</dd>
      {note && <dd className="text-muted-foreground text-xs">{note}</dd>}
    </div>
  );
}

function FormatHelp() {
  return (
    <aside className="bg-secondary/60 border-l-primary/50 text-muted-foreground flex flex-col gap-2 rounded-xl border-l-4 p-4 text-sm leading-relaxed">
      <Eyebrow className="text-foreground">File format</Eyebrow>
      <p>A CSV with these columns (Excel&apos;s comma or semicolon export works):</p>
      <ul className="list-disc pl-5 font-mono text-xs leading-relaxed">
        <li>prompt</li>
        <li>option_a … option_d</li>
        <li>correct (A–D)</li>
        <li>ai_answer (A–D)</li>
        <li>ai_explanation</li>
        <li>optional: context, ai_confidence (0–100), category, difficulty (1–3)</li>
      </ul>
      <p>JSON works too: a list with the same fields, or a task file in the repo&apos;s format.</p>
      <p>3 to 200 questions. Nothing is saved if any row has a problem; you get the row numbers to fix.</p>
      <div className="flex flex-col gap-1 pt-1">
        <a href="/samples/centaur-cases-template.csv" download className="text-foreground underline underline-offset-4">
          Download a template (CSV)
        </a>
        <a href="/samples/kyc-alerts-demo.csv" download className="text-foreground underline underline-offset-4">
          Example: 12 bank KYC alerts, AI wrong on 4 (CSV)
        </a>
      </div>
    </aside>
  );
}
