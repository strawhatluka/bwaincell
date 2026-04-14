import { DateTime } from 'luxon';

// Mock config BEFORE importing Reminder
jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
      defaultReminderChannel: 'test-channel-id',
    },
  },
}));

import Reminder from '../../../../supabase/models/Reminder';

describe('Reminder Model - calculateNextTrigger', () => {
  describe('Monthly Frequency', () => {
    it('should calculate next trigger for monthly reminder on day 15', () => {
      // Set current time to Jan 10, 2024 at 10:00 AM PST
      const now = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30', // 2:30 PM
        'monthly',
        null,
        null,
        15 // 15th of month
      );

      const expected = DateTime.fromObject(
        { year: 2024, month: 1, day: 15, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should schedule for next month if day has passed', () => {
      // Set current time to Jan 20, 2024 at 10:00 AM PST
      const now = DateTime.fromObject(
        { year: 2024, month: 1, day: 20, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'monthly',
        null,
        null,
        15 // Already passed in January
      );

      const expected = DateTime.fromObject(
        { year: 2024, month: 2, day: 15, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle day 31 in 30-day month (April)', () => {
      // Set current time to April 1, 2024
      const now = DateTime.fromObject(
        { year: 2024, month: 4, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'monthly',
        null,
        null,
        31 // April only has 30 days
      );

      // Should use last day of April (30th)
      const expected = DateTime.fromObject(
        { year: 2024, month: 4, day: 30, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle day 31 in February (non-leap year)', () => {
      // Set current time to Feb 1, 2023 (non-leap year)
      const now = DateTime.fromObject(
        { year: 2023, month: 2, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'monthly',
        null,
        null,
        31 // February only has 28 days in 2023
      );

      // Should use last day of February (28th)
      const expected = DateTime.fromObject(
        { year: 2023, month: 2, day: 28, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle day 31 in February (leap year)', () => {
      // Set current time to Feb 1, 2024 (leap year)
      const now = DateTime.fromObject(
        { year: 2024, month: 2, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'monthly',
        null,
        null,
        31 // February only has 29 days in 2024
      );

      // Should use last day of February (29th)
      const expected = DateTime.fromObject(
        { year: 2024, month: 2, day: 29, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle December to January rollover', () => {
      // Set current time to Dec 20, 2024
      const now = DateTime.fromObject(
        { year: 2024, month: 12, day: 20, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'monthly',
        null,
        null,
        15 // 15th has already passed
      );

      // Should schedule for Jan 15, 2025
      const expected = DateTime.fromObject(
        { year: 2025, month: 1, day: 15, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle same day but time has passed', () => {
      // Set current time to Jan 15, 2024 at 3:00 PM
      const now = DateTime.fromObject(
        { year: 2024, month: 1, day: 15, hour: 15, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30', // 2:30 PM (already passed)
        'monthly',
        null,
        null,
        15
      );

      // Should schedule for Feb 15
      const expected = DateTime.fromObject(
        { year: 2024, month: 2, day: 15, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });
  });

  describe('Yearly Frequency', () => {
    it('should calculate next trigger for yearly reminder on March 15', () => {
      // Set current time to Jan 10, 2024
      const now = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'yearly',
        null,
        null,
        15, // day
        3 // March
      );

      const expected = DateTime.fromObject(
        { year: 2024, month: 3, day: 15, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should schedule for next year if date has passed', () => {
      // Set current time to June 1, 2024
      const now = DateTime.fromObject(
        { year: 2024, month: 6, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'yearly',
        null,
        null,
        15, // day
        3 // March (already passed)
      );

      const expected = DateTime.fromObject(
        { year: 2025, month: 3, day: 15, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle Feb 29 in leap year', () => {
      // Set current time to Jan 1, 2024 (leap year)
      const now = DateTime.fromObject(
        { year: 2024, month: 1, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'yearly',
        null,
        null,
        29, // Feb 29
        2 // February
      );

      const expected = DateTime.fromObject(
        { year: 2024, month: 2, day: 29, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle Feb 29 in non-leap year (fallback to Feb 28)', () => {
      // Set current time to Jan 1, 2023 (non-leap year)
      const now = DateTime.fromObject(
        { year: 2023, month: 1, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'yearly',
        null,
        null,
        29, // Feb 29 (doesn't exist in 2023)
        2 // February
      );

      // Should use Feb 28, 2023
      const expected = DateTime.fromObject(
        { year: 2023, month: 2, day: 28, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle Dec 31 yearly reminder', () => {
      // Set current time to Feb 1, 2024
      const now = DateTime.fromObject(
        { year: 2024, month: 2, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '23:59',
        'yearly',
        null,
        null,
        31, // Dec 31
        12 // December
      );

      const expected = DateTime.fromObject(
        { year: 2024, month: 12, day: 31, hour: 23, minute: 59, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should rollover to next year when Dec 31 has passed', () => {
      // Set current time to Dec 31, 2024 at 11:59 PM
      const now = DateTime.fromObject(
        { year: 2024, month: 12, day: 31, hour: 23, minute: 59 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '12:00', // Noon (already passed)
        'yearly',
        null,
        null,
        31,
        12
      );

      // Should schedule for Dec 31, 2025
      const expected = DateTime.fromObject(
        { year: 2025, month: 12, day: 31, hour: 12, minute: 0, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });

    it('should handle leap year transition (Feb 29 2024 -> Feb 28 2025)', () => {
      // Set current time to March 1, 2024 (after Feb 29 in leap year)
      const now = DateTime.fromObject(
        { year: 2024, month: 3, day: 1, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger(
        '14:30',
        'yearly',
        null,
        null,
        29, // Feb 29
        2
      );

      // Should schedule for Feb 28, 2025 (non-leap year)
      const expected = DateTime.fromObject(
        { year: 2025, month: 2, day: 28, hour: 14, minute: 30, second: 0 },
        { zone: 'America/Los_Angeles' }
      ).toJSDate();

      expect(result).toEqual(expected);
    });
  });

  describe('Timezone Handling', () => {
    it('should correctly handle monthly reminders in PST timezone', () => {
      const now = DateTime.fromObject(
        { year: 2024, month: 1, day: 10, hour: 10, minute: 0 },
        { zone: 'America/Los_Angeles' }
      );
      jest.spyOn(DateTime, 'now').mockReturnValue(now);

      const result = Reminder.calculateNextTrigger('14:30', 'monthly', null, null, 15);

      // Verify the result is in PST
      const resultDt = DateTime.fromJSDate(result).setZone('America/Los_Angeles');
      expect(resultDt.hour).toBe(14);
      expect(resultDt.minute).toBe(30);
      expect(resultDt.day).toBe(15);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
