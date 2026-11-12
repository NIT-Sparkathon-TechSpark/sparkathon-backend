import type { Interval, Rate } from "@/lib/metrics";

/** "62%" from a fraction or a Rate; an em dash when there is no value. */
export function pct(value: Rate | number | null | undefined): string {
  const v = typeof value === "object" && value !== null ? value.value : value;
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

/** "+4 pts" / "−3 pts" from a fraction difference. */
export function points(value: number | null | undefined): string {
  if (value == null) return "—";
  const p = Math.round(value * 100);
  if (p === 0) return "±0 pts";
  return `${p > 0 ? "+" : "−"}${Math.abs(p)} ${Math.abs(p) === 1 ? "pt" : "pts"}`;
}

/** Confidence change on the 25–100 scale: "+6.4" / "−2.0". */
export function signed(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  const fixed = Math.abs(value).toFixed(digits);
  if (Number(fixed) === 0) return `±${fixed}`;
  return `${value > 0 ? "+" : "−"}${fixed}`;
}

/** "95% CI 48–71%" for a fraction interval. */
export function intervalText(interval: Interval | null, asPoints = false): string | null {
  if (!interval) return null;
  if (asPoints) {
    const lo = Math.round(interval.low * 100);
    const hi = Math.round(interval.high * 100);
    return `95% CI ${lo > 0 ? "+" : ""}${lo} to ${hi > 0 ? "+" : ""}${hi} pts`;
  }
  return `95% CI ${Math.round(interval.low * 100)}–${Math.round(interval.high * 100)}%`;
}

/** "7 of 12" for a Rate. */
export const kOfN = (r: Rate) => `${r.k} of ${r.n}`;
