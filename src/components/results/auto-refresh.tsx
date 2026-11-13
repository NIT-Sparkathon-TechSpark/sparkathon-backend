"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5_000;
const IDLE_STOP_MS = 10 * 60_000;

/**
 * Spec 0001 "Live results": re-render the page on the server every 5 seconds with
 * router.refresh(). Pauses while the tab is hidden and stops after about 10 minutes with no
 * input from the viewer, to protect the free database plan. Results screens only.
 */
export function AutoRefresh({ className }: { className?: string }) {
  const router = useRouter();
  const lastInput = useRef(0);
  const [state, setState] = useState<"live" | "hidden" | "idle">("live");

  useEffect(() => {
    lastInput.current = Date.now();
    const onInput = () => {
      lastInput.current = Date.now();
      setState((s) => (s === "idle" ? "live" : s));
    };
    const onVisibility = () => setState(document.hidden ? "hidden" : "live");
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, onInput, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - lastInput.current > IDLE_STOP_MS) {
        setState("idle");
        return;
      }
      router.refresh();
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, onInput);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  if (state === "live") return null;

  return (
    <span
      className={cn("text-muted-foreground inline-flex items-center gap-2 text-xs", className)}
      aria-live="polite"
    >
      <span className="bg-muted-foreground/40 size-2 rounded-full" />
      {state === "hidden" && "Paused while hidden"}
      {state === "idle" && "Paused after 10 min idle · move the mouse to resume"}
    </span>
  );
}
