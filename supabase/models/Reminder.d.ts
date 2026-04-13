import type { ReminderRow, ReminderFrequency } from '../types';
declare class Reminder {
  static createReminder(
    guildId: string,
    channelId: string,
    message: string,
    time: string,
    frequency?: ReminderFrequency,
    dayOfWeek?: number | null,
    userId?: string,
    targetDate?: Date | null,
    dayOfMonth?: number | null,
    month?: number | null
  ): Promise<ReminderRow>;
  /**
   * Calculate the next trigger time for a reminder in the configured timezone.
   *
   * Uses Luxon DateTime to handle timezone-aware date calculations, ensuring
   * reminders fire at the correct local time regardless of server timezone.
   *
   * @param time - Time string in 24-hour format (e.g., "17:00")
   * @param frequency - Reminder frequency: 'once', 'daily', 'weekly', 'monthly', or 'yearly'
   * @param dayOfWeek - Day of week for weekly reminders (0-6, Sun-Sat), null otherwise
   * @param targetDate - Optional specific date for one-time reminders
   * @param dayOfMonth - Day of month for monthly/yearly reminders (1-31), null otherwise
   * @param month - Month for yearly reminders (1-12), null otherwise
   * @returns JavaScript Date object representing next trigger time
   */
  static calculateNextTrigger(
    time: string,
    frequency: ReminderFrequency,
    dayOfWeek: number | null,
    targetDate?: Date | null,
    dayOfMonth?: number | null,
    month?: number | null
  ): Date;
  static getActiveReminders(): Promise<ReminderRow[]>;
  static getUserReminders(guildId: string): Promise<ReminderRow[]>;
  static deleteReminder(reminderId: number, guildId: string): Promise<boolean>;
  static updateNextTrigger(reminderId: number): Promise<ReminderRow | null>;
  static getTriggeredReminders(): Promise<ReminderRow[]>;
}
export default Reminder;
//# sourceMappingURL=Reminder.d.ts.map
