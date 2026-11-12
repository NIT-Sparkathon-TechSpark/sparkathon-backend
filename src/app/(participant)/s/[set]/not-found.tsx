import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Shell } from "../../_components/shell";

export default function SetNotFound() {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">That question set does not exist</h1>
      <p className="text-muted-foreground">Check the link or scan the QR code again.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Go to the start
      </Link>
    </Shell>
  );
}
