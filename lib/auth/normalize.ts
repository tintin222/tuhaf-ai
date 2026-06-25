/** Trim + lowercase an email for consistent lookups and storage. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
