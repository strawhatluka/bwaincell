import type { ScheduleRow } from '../types';
type ScheduleFilter = 'upcoming' | 'past' | 'all';
interface CountdownResult {
  event: ScheduleRow;
  timeLeft: string;
}
declare class Schedule {
  static addEvent(
    guildId: string,
    event: string,
    date: string,
    time: string,
    description?: string | null,
    userId?: string
  ): Promise<ScheduleRow>;
  static getEvents(guildId: string, filter?: ScheduleFilter): Promise<ScheduleRow[]>;
  static deleteEvent(eventId: number, guildId: string): Promise<boolean>;
  static getCountdown(guildId: string, eventName: string): Promise<CountdownResult | null>;
  static getTodaysEvents(guildId: string): Promise<ScheduleRow[]>;
  static getUpcomingEvents(guildId: string, days?: number): Promise<ScheduleRow[]>;
}
export default Schedule;
export type { ScheduleFilter, CountdownResult };
//# sourceMappingURL=Schedule.d.ts.map
