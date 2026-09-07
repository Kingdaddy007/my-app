/**
 * Pure Quiet Hours verification logic.
 */

export function isInQuietHours(date: Date, quietStart: string, quietEnd: string): boolean {
  const [startHour, startMin] = quietStart.split(':').map(Number);
  const [endHour, endMin] = quietEnd.split(':').map(Number);

  const curMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes > endMinutes) {
    // Overnight span, e.g. 22:00 to 07:00
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  } else {
    // Same-day span
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  }
}
