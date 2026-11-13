"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type FilterOption = { href: string; label: string; active: boolean };

/**
 * A compact dropdown for one filter: "Question set: All ▾". Every option is a plain link, so each
 * view keeps its own shareable URL. Closes on choice, outside click and Escape.
 */
export function FilterMenu({ label, options, align = "start" }: { label: string; options: FilterOption[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.active)?.label ?? options[0]?.label;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "bg-card/70 hover:bg-card flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-colors",
          open && "bg-card ring-primary/40",
        )}
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{current}</span>
        <svg aria-hidden viewBox="0 0 16 16" className={cn("size-3.5 transition-transform", open && "rotate-180")}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id={id}
          className={cn(
            "bg-card absolute top-full z-30 mt-2 flex min-w-52 flex-col gap-0.5 rounded-2xl p-1.5 shadow-xl shadow-black/10 ring-1 ring-foreground/10",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {options.map((o) => (
            <li key={o.href}>
              <Link
                href={o.href}
                scroll={false}
                aria-current={o.active ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm transition-colors",
                  o.active ? "bg-accent text-accent-foreground font-medium" : "hover:bg-secondary",
                )}
              >
                {o.label}
                {o.active && (
                  <svg aria-hidden viewBox="0 0 16 16" className="text-primary size-4">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** An on/off switch that is really a link to the other state. */
export function FilterSwitch({ href, on, label }: { href: string; on: boolean; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      role="switch"
      aria-checked={on}
      className="text-muted-foreground hover:text-foreground flex h-9 items-center gap-2 text-sm transition-colors"
    >
      <span
        aria-hidden
        className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-primary" : "bg-secondary ring-1 ring-foreground/10")}
      >
        <span
          className={cn(
            "bg-background absolute top-0.5 left-0.5 size-4 rounded-full shadow-sm transition-transform",
            on && "translate-x-4",
          )}
        />
      </span>
      {label}
    </Link>
  );
}
