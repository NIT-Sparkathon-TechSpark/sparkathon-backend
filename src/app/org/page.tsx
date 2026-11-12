import type { Metadata } from "next";
import Link from "next/link";
import { signOutOrgAction } from "@/actions/org";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readOrgId } from "@/lib/org-auth";
import { ORG_SLUG } from "@/lib/org-schemas";
import { CreateOrgForm, SignInForm } from "./_components/forms";

export const metadata: Metadata = { title: "Organizations · The Centaur Test" };
export const dynamic = "force-dynamic";

/** Create an organization, or sign in to one (docs/plan/org-accounts.md). */
export default async function OrgHome({ searchParams }: PageProps<"/org">) {
  const { signin } = await searchParams;
  const slugHint = typeof signin === "string" && ORG_SLUG.test(signin) ? signin : "";

  let signedIn: { slug: string; name: string } | null = null;
  const orgId = await readOrgId();
  if (orgId) {
    try {
      const { findOrgById } = await import("@/db/queries/orgs");
      signedIn = await findOrgById(orgId);
    } catch {
      signedIn = null;
    }
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm font-medium">The Centaur Test for organizations</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Test how your people rely on your AI, on your own cases
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Upload questions from your own work, with the answers your AI assistant gave. Share a private link with your
          team. See where they catch the AI&apos;s mistakes and where they follow them. Your sets and results are
          visible only to your organization.
        </p>
      </header>

      {signedIn && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p>
              Signed in as <span className="font-semibold">{signedIn.name}</span>{" "}
              <span className="text-muted-foreground">({signedIn.slug})</span>
            </p>
            <div className="flex gap-2">
              <Link href={`/org/${signedIn.slug}`} className={buttonVariants()}>
                Open dashboard
              </Link>
              <form action={signOutOrgAction}>
                <Button type="submit" variant="ghost">
                  Sign out
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>With your organization ID and passcode.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm defaultSlug={slugHint} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New organization</CardTitle>
            <CardDescription>Takes a minute. No personal accounts: the team shares one passcode.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrgForm />
          </CardContent>
        </Card>
      </div>

      <Link href="/" className="text-muted-foreground text-sm underline underline-offset-4">
        Back to the public test
      </Link>
    </>
  );
}
