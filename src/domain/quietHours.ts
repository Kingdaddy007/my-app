/**
 * Pure Quiet Hours verification logic.
 */

export function parseQuietTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const min = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
    return null;
  }
  return hour * 60 + min;
}

export function isInQuietHours(date: Date, quietStart: string, quietEnd: string): boolean {
  const startMinutes = parseQuietTime(quietStart);
  const endMinutes = parseQuietTime(quietEnd);
  if (startMinutes == null || endMinutes == null) return false;

  const curMinutes = date.getHours() * 60 + date.getMinutes();

  if (startMinutes > endMinutes) {
    // Overnight span, e.g. 22:00 to 07:00
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  } else {
    // Same-day span
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  }
}
