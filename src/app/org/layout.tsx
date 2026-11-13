import Link from "next/link";
import { Backdrop, SiteHeader } from "@/app/(participant)/_components/shell";
import { buttonVariants } from "@/components/ui/button";

/** The organization area uses the same top bar, background and width as the public results. */
export default function OrgLayout({ children }: LayoutProps<"/org">) {
  return (
    <>
      <Backdrop quiet />
      <SiteHeader homeLink>
        <Link href="/org" className={buttonVariants({ variant: "ghost" })}>
          For organizations
        </Link>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
        {children}
      </main>
    </>
  );
}
