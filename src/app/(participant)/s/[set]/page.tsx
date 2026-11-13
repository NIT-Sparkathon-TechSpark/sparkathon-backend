import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseLinkLabel } from "@/lib/participant-schemas";
import { isParticipantSet, PARTICIPANT_SETS } from "@/lib/sets";
import { SetFlow } from "../../_components/set-flow";

export const metadata: Metadata = { title: "The Centaur Test" };

// Always read the cookie and the database fresh. Reads only; every write is a Server Action.
export const dynamic = "force-dynamic";

/** A public set, open to anyone with the link. The flow itself lives in SetFlow. */
export default async function SetPage({ params, searchParams }: PageProps<"/s/[set]">) {
  const { set } = await params;
  if (!isParticipantSet(set)) notFound();
  const { label } = await searchParams;
  const { name, blurb } = PARTICIPANT_SETS[set];

  return (
    <SetFlow
      set={{ slug: set, ref: set, name, blurb, owner: null }}
      label={parseLinkLabel(Array.isArray(label) ? label[0] : label)}
    />
  );
}
