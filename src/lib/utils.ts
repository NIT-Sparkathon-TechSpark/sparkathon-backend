import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui class name helper: merges Tailwind classes, later ones win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
