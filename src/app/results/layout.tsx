export default function ResultsLayout({ children }: LayoutProps<"/results">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      {children}
    </main>
  );
}
