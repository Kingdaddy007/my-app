import { describe, test, expect } from '@jest/globals';
import { isInQuietHours } from '../src/domain/quietHours';

describe('T08 - Notifications & Quiet Hours Logic', () => {
  test('Overnight quiet hours (22:00 - 07:00) correctly classifies times', () => {
    const quietStart = '22:00';
    const quietEnd = '07:00';

    // 23:30 -> in quiet hours
    const date2330 = new Date('2026-09-07T23:30:00');
    expect(isInQuietHours(date2330, quietStart, quietEnd)).toBe(true);

    // 04:15 -> in quiet hours
    const date0415 = new Date('2026-09-07T04:15:00');
    expect(isInQuietHours(date0415, quietStart, quietEnd)).toBe(true);

    // 07:00 -> exactly end -> NOT in quiet hours
    const date0700 = new Date('2026-09-07T07:00:00');
    expect(isInQuietHours(date0700, quietStart, quietEnd)).toBe(false);

    // 14:30 -> daytime -> NOT in quiet hours
    const date1430 = new Date('2026-09-07T14:30:00');
    expect(isInQuietHours(date1430, quietStart, quietEnd)).toBe(false);
  });

  test('Same-day quiet hours (12:00 - 14:00) correctly classifies times', () => {
    const quietStart = '12:00';
    const quietEnd = '14:00';

    const date1300 = new Date('2026-09-07T13:00:00');
    expect(isInQuietHours(date1300, quietStart, quietEnd)).toBe(true);

    const date1500 = new Date('2026-09-07T15:00:00');
    expect(isInQuietHours(date1500, quietStart, quietEnd)).toBe(false);
  });
});
