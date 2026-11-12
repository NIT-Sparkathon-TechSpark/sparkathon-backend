import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { signOutOrgAction } from "@/actions/org";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgSetSummary } from "@/db/queries/orgs";
import { requireOrg } from "@/lib/org-auth";
import { CopyLink, UploadForm } from "../_components/forms";

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

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">Organization · {org.slug}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/org/${org.slug}/results`} className={buttonVariants()}>
            Results
          </Link>
          <form action={signOutOrgAction}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Your question sets</h2>
        {sets === null ? (
          <p className="rounded-lg border border-dashed p-4 text-sm">
            Your sets could not be loaded. If this is a new database, the organization tables may not be set up yet
            (run <code>pnpm db:migrate</code>).
          </p>
        ) : sets.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No sets yet. Upload your first one below.
          </p>
        ) : (
          sets.map((set) => <SetCard key={set.slug} set={set} origin={origin} orgSlug={org.slug} />)
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add a set from your own work</CardTitle>
          <CardDescription>
            One row per question: the case, four options, the correct one, and what your AI answered and why. Include
            cases where your AI was wrong, about a third, or over-reliance can&apos;t be measured.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[3fr_2fr]">
          <UploadForm />
          <FormatHelp />
        </CardContent>
      </Card>
    </>
  );
}

function SetCard({ set, origin, orgSlug }: { set: OrgSetSummary; origin: string; orgSlug: string }) {
  const link = `${origin}/t/${set.shareToken}`;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{set.name}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{set.tasks} questions</Badge>
            <Badge variant="secondary">AI wrong on {set.aiWrong}</Badge>
            <Badge variant="outline">
              {set.completedSessions} finished · {set.startedSessions} started
            </Badge>
          </div>
        </div>
        {set.description && <CardDescription>{set.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Participant link</p>
          <CopyLink url={link} />
          <p className="text-muted-foreground text-xs">
            Anyone with this link can take the test, so share it only with your team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`/t/${set.shareToken}?label=practice`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Try it yourself (not counted)
          </a>
          <Link href={`/org/${orgSlug}/results?set=${set.slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Results for this set
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function FormatHelp() {
  return (
    <div className="text-muted-foreground flex flex-col gap-2 text-sm">
      <p className="text-foreground font-medium">File format</p>
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
    </div>
  );
}
