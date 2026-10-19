/** Normalize spelling only. Approval always requires a separate exact database match. */
export function normalizeSchoolEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (email.length > 254 || !/^[\x21-\x7e]+$/.test(email)) return null;
  const normalized = email.toLowerCase();
  const parts = normalized.split('@');
  if (parts.length !== 2 || parts[1] !== 'sendelta.com' || parts[0].length > 64) return null;
  return /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(parts[0]) ? normalized : null;
}
