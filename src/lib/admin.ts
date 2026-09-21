/**
 * Admin bypass logic.
 *
 * ADMIN_EMAILS is a comma-separated env var, e.g.
 *   ADMIN_EMAILS="wxwrobjustice@gmail.com,other@admin.com"
 *
 * Admin users are exempt from message caps, rate limits, and billing checks
 * everywhere in the app. This is the single source of truth for that check -
 * always import isAdminEmail() rather than re-deriving the whitelist.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
