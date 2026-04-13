import { DateTime } from 'luxon';
import supabase from '../supabase';
import type { ReminderRow, ReminderFrequency } from '../types';
const TIMEZONE = process.env.TIMEZONE || 'America/Los_Angeles';

class Reminder {
  static async createReminder(
    guildId: string,
    channelId: string,
    message: string,
    time: string,
    frequency: ReminderFrequency = 'once',
    dayOfWeek: number | null = null,
    userId?: string,
    targetDate?: Date | null,
    dayOfMonth?: number | null,
    month?: number | null
  ): Promise<ReminderRow> {
    const nextTrigger = this.calculateNextTrigger(
      time,
      frequency,
      dayOfWeek,
      targetDate,
      dayOfMonth,
      month
    );

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: userId || 'system', // Keep for audit trail (WO-015)
        guild_id: guildId,
        channel_id: channelId,
        message,
        time,
        frequency,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        month: month,
        next_trigger: nextTrigger.toISOString(),
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data!;
  }

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
  ): Date {
    const timezone = TIMEZONE; // e.g., 'America/Los_Angeles'

    // Get current time in user's timezone
    const now = DateTime.now().setZone(timezone);

    // Parse user's input time (e.g., "17:00")
    const [hours, minutes] = time.split(':').map(Number);

    // Create datetime in user's timezone
    let nextTrigger: DateTime;

    if (targetDate) {
      // Use the specific target date provided
      nextTrigger = DateTime.fromJSDate(targetDate).setZone(timezone).set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
      });
    } else {
      // Use today's date
      nextTrigger = DateTime.now().setZone(timezone).set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
      });
    }

    if (frequency === 'once') {
      // If no target date specified and time has already passed today, schedule for tomorrow
      if (!targetDate && nextTrigger < now) {
        nextTrigger = nextTrigger.plus({ days: 1 });
      }
    } else if (frequency === 'daily') {
      if (nextTrigger < now) {
        nextTrigger = nextTrigger.plus({ days: 1 });
      }
    } else if (frequency === 'weekly' && dayOfWeek !== null) {
      // Luxon uses 1-7 (Mon-Sun), JavaScript uses 0-6 (Sun-Sat)
      // Convert dayOfWeek from JS format (0-6) to Luxon weekday (1-7)
      const luxonWeekday = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday: 0->7
      const currentWeekday = now.weekday;

      let daysUntilNext = (luxonWeekday - currentWeekday + 7) % 7;

      // If it's the same day, check if the time has passed
      if (daysUntilNext === 0) {
        // If time hasn't passed yet today, keep it at 0 days (today)
        // If time has passed, schedule for next week (7 days)
        if (nextTrigger < now) {
          daysUntilNext = 7;
        }
      }

      nextTrigger = nextTrigger.plus({ days: daysUntilNext });
    } else if (frequency === 'monthly' && dayOfMonth !== null) {
      // Calculate next monthly trigger
      let nextTrigger = now.set({
        day: dayOfMonth,
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
      });

      // Handle invalid dates (e.g., Feb 31 → last day of Feb)
      // Luxon rolls over invalid dates, so check if we got the day we requested
      if (nextTrigger.day !== dayOfMonth) {
        nextTrigger = now.endOf('month').set({
          hour: hours,
          minute: minutes,
          second: 0,
          millisecond: 0,
        });
      }

      // If time has passed this month, schedule for next month
      if (nextTrigger < now) {
        nextTrigger = nextTrigger.plus({ months: 1 });

        // Re-validate for next month (handle month boundaries)
        if (nextTrigger.day !== dayOfMonth) {
          nextTrigger = nextTrigger.endOf('month').set({
            hour: hours,
            minute: minutes,
            second: 0,
            millisecond: 0,
          });
        }
      }

      return nextTrigger.toJSDate();
    } else if (frequency === 'yearly' && month !== null && dayOfMonth !== null) {
      // Calculate next yearly trigger
      let nextTrigger = now.set({
        month,
        day: dayOfMonth,
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
      });

      // Handle leap year edge case (Feb 29 in non-leap year)
      // Luxon rolls over invalid dates, so check if we got the day we requested
      if (nextTrigger.day !== dayOfMonth || nextTrigger.month !== month) {
        // Get the last day of the specified month in current year
        nextTrigger = DateTime.fromObject(
          {
            year: now.year,
            month,
          },
          { zone: timezone }
        )
          .endOf('month')
          .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
      }

      // If date has passed this year, schedule for next year
      if (nextTrigger < now) {
        nextTrigger = nextTrigger.plus({ years: 1 });

        // Re-validate for next year (leap year handling)
        if (nextTrigger.day !== dayOfMonth || nextTrigger.month !== month) {
          nextTrigger = DateTime.fromObject(
            {
              year: nextTrigger.year,
              month,
            },
            { zone: timezone }
          )
            .endOf('month')
            .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
        }
      }

      return nextTrigger.toJSDate();
    }

    // Convert to JavaScript Date
    return nextTrigger.toJSDate();
  }

  static async getActiveReminders(): Promise<ReminderRow[]> {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('active', true)
      .order('next_trigger', { ascending: true });

    return data || [];
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getUserReminders(guildId: string): Promise<ReminderRow[]> {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('guild_id', guildId)
      .eq('active', true)
      .order('next_trigger', { ascending: true });

    return data || [];
  }

  static async deleteReminder(reminderId: number, guildId: string): Promise<boolean> {
    const { data } = await supabase
      .from('reminders')
      .update({ active: false })
      .eq('id', reminderId)
      .eq('guild_id', guildId)
      .select()
      .single();

    return !!data;
  }

  static async updateNextTrigger(reminderId: number): Promise<ReminderRow | null> {
    const { data: reminder } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (!reminder || !reminder.active) return null;

    if (reminder.frequency === 'once') {
      const { data } = await supabase
        .from('reminders')
        .update({ active: false })
        .eq('id', reminderId)
        .select()
        .single();

      return data;
    } else {
      const nextTrigger = this.calculateNextTrigger(
        reminder.time,
        reminder.frequency as ReminderFrequency,
        reminder.day_of_week ?? null,
        null,
        reminder.day_of_month ?? null,
        reminder.month ?? null
      );

      const { data } = await supabase
        .from('reminders')
        .update({ next_trigger: nextTrigger.toISOString() })
        .eq('id', reminderId)
        .select()
        .single();

      return data;
    }
  }

  static async getTriggeredReminders(): Promise<ReminderRow[]> {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('active', true)
      .lte('next_trigger', new Date().toISOString());

    return data || [];
  }
}

export default Reminder;
