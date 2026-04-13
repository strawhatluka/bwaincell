/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize, Op } from 'sequelize';
import { DateTime } from 'luxon';
import schemas from '../schema';
import config from '../../config/config';

// Define filter types
type ScheduleFilter = 'upcoming' | 'past' | 'all';

// Define attributes interface matching the schema
interface ScheduleAttributes {
  id: number;
  event: string;
  date: string; // DATEONLY type
  time: string; // TIME type
  description?: string | null;
  user_id: string;
  guild_id: string;
  created_at: Date;
}

// Creation attributes (id and created_at are optional during creation)
interface ScheduleCreationAttributes
  extends Optional<ScheduleAttributes, 'id' | 'created_at' | 'description'> {}

// Interface for countdown result
interface CountdownResult {
  event: Schedule;
  timeLeft: string;
}

const ScheduleBase = Model as any;
class Schedule
  extends ScheduleBase<ScheduleAttributes, ScheduleCreationAttributes>
  implements ScheduleAttributes
{
  // Sequelize automatically provides getters/setters for these fields
  // Commenting out to prevent shadowing warnings
  // public id!: number;
  // public event!: string;
  // public date!: string;
  // public time!: string;
  // public description?: string | null;
  // public user_id!: string;
  // public guild_id!: string;
  // public created_at!: Date;

  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.schedule, {
      sequelize,
      modelName: 'Schedule',
      tableName: 'schedules',
      timestamps: false,
    });
  }

  static async addEvent(
    guildId: string,
    event: string,
    date: string,
    time: string,
    description: string | null = null,
    userId?: string
  ): Promise<Schedule> {
    return await (this as any).create({
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      event,
      date,
      time,
      description,
    });
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getEvents(
    guildId: string,
    filter: ScheduleFilter = 'upcoming'
  ): Promise<Schedule[]> {
    const where: Record<string, unknown> = { guild_id: guildId };
    // Get today's date in the configured timezone (not UTC)
    const today = DateTime.now().setZone(config.settings.timezone).toFormat('yyyy-MM-dd');

    if (filter === 'upcoming') {
      where.date = { [Op.gte]: today };
    } else if (filter === 'past') {
      where.date = { [Op.lt]: today };
    }

    return await (this as any).findAll({
      where,
      order: [
        ['date', filter === 'past' ? 'DESC' : 'ASC'],
        ['time', 'ASC'],
      ],
    });
  }

  static async deleteEvent(eventId: number, guildId: string): Promise<boolean> {
    const result = await (this as any).destroy({
      where: { id: eventId, guild_id: guildId },
    });

    return result > 0;
  }

  static async getCountdown(guildId: string, eventName: string): Promise<CountdownResult | null> {
    const event = await (this as any).findOne({
      where: {
        guild_id: guildId,
        event: { [Op.like]: `%${eventName}%` },
      },
      order: [
        ['date', 'ASC'],
        ['time', 'ASC'],
      ],
    });

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

  static async getTodaysEvents(guildId: string): Promise<Schedule[]> {
    // Get today's date in the configured timezone (not UTC)
    const today = DateTime.now().setZone(config.settings.timezone).toFormat('yyyy-MM-dd');

    return await (this as any).findAll({
      where: {
        guild_id: guildId,
        date: today,
      },
      order: [['time', 'ASC']],
    });
  }

  static async getUpcomingEvents(guildId: string, days: number = 7): Promise<Schedule[]> {
    // Get date range in the configured timezone (not UTC)
    const now = DateTime.now().setZone(config.settings.timezone);
    const future = now.plus({ days });

    return await (this as any).findAll({
      where: {
        guild_id: guildId,
        date: {
          [Op.between]: [now.toFormat('yyyy-MM-dd'), future.toFormat('yyyy-MM-dd')],
        },
      },
      order: [
        ['date', 'ASC'],
        ['time', 'ASC'],
      ],
    });
  }
}

export default Schedule;
