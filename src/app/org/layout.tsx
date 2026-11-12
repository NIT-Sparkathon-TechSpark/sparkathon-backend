export default function OrgLayout({ children }: LayoutProps<"/org">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">{children}</main>
  );
}
