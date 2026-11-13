import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseLinkLabel } from "@/lib/participant-schemas";
import { isShareToken } from "@/lib/sets";
import { SetFlow } from "../../_components/set-flow";

export const metadata: Metadata = { title: "The Centaur Test", robots: { index: false, follow: false } };

// Always read the cookie and the database fresh. Reads only; every write is a Server Action.
export const dynamic = "force-dynamic";

/**
 * An organization's private set (docs/plan/org-accounts.md). The token in the address is the only
 * way in: the set has no public name, and an unknown token looks exactly like a missing page.
 */
export default async function SharedSetPage({ params, searchParams }: PageProps<"/t/[token]">) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();

  const { findSetByToken } = await import("@/db/queries/orgs");
  const shared = await findSetByToken(token);
  if (!shared) notFound();

  const { label } = await searchParams;
  return (
    <SetFlow
      set={{
        slug: shared.slug,
        ref: token,
        name: shared.name,
        blurb: shared.description ?? "",
        owner: shared.orgName,
      }}
      label={parseLinkLabel(Array.isArray(label) ? label[0] : label)}
    />
  );
}
