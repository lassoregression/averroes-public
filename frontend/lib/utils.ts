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

/**
 * Format a timestamp string into a human-readable relative time.
 * Used in the sidebar for conversation timestamps.
 *
 * @example
 * formatRelativeTime("2024-01-15T10:30:00Z") // => "2 hours ago"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  /* For older dates, show the actual date */
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Truncate text to a max length with ellipsis.
 * Used for conversation previews in the sidebar.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}
