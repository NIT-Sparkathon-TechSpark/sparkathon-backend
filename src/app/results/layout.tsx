import { Backdrop, SiteHeader } from "@/app/(participant)/_components/shell";
import { buttonVariants } from "@/components/ui/button";

export default function ResultsLayout({ children }: LayoutProps<"/results">) {
  return (
    <>
      <Backdrop quiet />
      <SiteHeader homeLink>
        <a href="/#sets" className={buttonVariants()}>
          Take the test
        </a>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
        {children}
      </main>
    </>
  );
}
