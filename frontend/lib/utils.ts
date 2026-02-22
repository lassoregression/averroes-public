/**
 * Utility functions used across the Averroes frontend.
 *
 * - cn(): Merges Tailwind CSS classes with proper conflict resolution.
 *   Uses clsx for conditional classes + tailwind-merge to handle
 *   cases like "px-4 px-6" where only the last should apply.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge CSS class names with Tailwind-aware conflict resolution.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-accent-red text-white", "px-6")
 * // => "py-2 bg-accent-red text-white px-6"  (px-4 is overridden by px-6)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


