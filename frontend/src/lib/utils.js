import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a JSON string with fallback value.
 * Handles null, undefined, empty strings, already-parsed objects, and malformed JSON.
 */
export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
}
