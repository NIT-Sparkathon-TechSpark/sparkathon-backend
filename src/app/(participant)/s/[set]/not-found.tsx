import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Shell } from "../../_components/shell";

export default function SetNotFound() {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">We can&apos;t find that topic</h1>
      <p className="text-muted-foreground">Check the link or scan the QR code again.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Back to the home page
      </Link>
    </Shell>
  );
}
