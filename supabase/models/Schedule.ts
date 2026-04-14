import { DateTime } from 'luxon';
import supabase from '../supabase';
const TIMEZONE = process.env.TIMEZONE || 'America/Los_Angeles';
import type { ScheduleRow, ScheduleInsert } from '../types';

// Define filter types
type ScheduleFilter = 'upcoming' | 'past' | 'all';

// Interface for countdown result
interface CountdownResult {
  event: ScheduleRow;
  timeLeft: string;
}

class Schedule {
  static async addEvent(
    guildId: string,
    event: string,
    date: string,
    time: string,
    description: string | null = null,
    userId?: string
  ): Promise<ScheduleRow> {
    const insert: ScheduleInsert = {
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      event,
      date,
      time,
      description,
    };

    const { data, error } = await supabase.from('schedules').insert(insert).select().single();

    if (error) throw error;
    return data;
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getEvents(
    guildId: string,
    filter: ScheduleFilter = 'upcoming'
  ): Promise<ScheduleRow[]> {
    // Get today's date in the configured timezone (not UTC)
    const today = DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd');

    let query = supabase.from('schedules').select('*').eq('guild_id', guildId);

    if (filter === 'upcoming') {
      query = query.gte('date', today);
    } else if (filter === 'past') {
      query = query.lt('date', today);
    }

    query = query
      .order('date', { ascending: filter !== 'past' })
      .order('time', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static async deleteEvent(eventId: number, guildId: string): Promise<boolean> {
    const { error, count } = await supabase
      .from('schedules')
      .delete({ count: 'exact' })
      .eq('id', eventId)
      .eq('guild_id', guildId);

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  static async getCountdown(guildId: string, eventName: string): Promise<CountdownResult | null> {
    const { data: events, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('guild_id', guildId)
      .ilike('event', `%${eventName}%`)
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(1);

    if (error) throw error;

    const event = events?.[0];
    if (!event) return null;

    const eventDateTime = new Date(`${event.date} ${event.time}`);
    const now = new Date();
    const diff = eventDateTime.getTime() - now.getTime();

    if (diff <= 0) return { event, timeLeft: 'Event has passed' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

    return {
      event,
      timeLeft: parts.length > 0 ? parts.join(', ') : 'Less than a minute',
    };
  }

  static async getTodaysEvents(guildId: string): Promise<ScheduleRow[]> {
    // Get today's date in the configured timezone (not UTC)
    const today = DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd');

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('guild_id', guildId)
      .eq('date', today)
      .order('time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getUpcomingEvents(guildId: string, days: number = 7): Promise<ScheduleRow[]> {
    // Get date range in the configured timezone (not UTC)
    const now = DateTime.now().setZone(TIMEZONE);
    const future = now.plus({ days });

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('guild_id', guildId)
      .gte('date', now.toFormat('yyyy-MM-dd'))
      .lte('date', future.toFormat('yyyy-MM-dd'))
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export default Schedule;
export type { ScheduleFilter, CountdownResult };
