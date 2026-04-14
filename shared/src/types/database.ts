/**
 * Shared Database Model Interfaces
 *
 * These types represent the data structures used across backend and frontend.
 * They are extracted from Sequelize models but kept framework-agnostic.
 */

/**
 * Task Model
 * Represents a task in the Discord bot task management system
 */
export interface TaskModel {
  id: number;
  description: string;
  due_date?: Date | null;
  completed: boolean;
  created_at: Date;
  completed_at?: Date | null;
  user_id: string;
  guild_id: string;
}

/**
 * List Item
 * Represents a single item within a List
 */
export interface ListItem {
  text: string;
  completed: boolean;
  added_at: Date;
}

/**
 * List Model
 * Represents a shopping list, todo list, or any collection of items
 */
export interface ListModel {
  id: number;
  name: string;
  items: ListItem[];
  user_id: string;
  guild_id: string;
  created_at: Date;
}

/**
 * Reminder Frequency
 * How often a reminder should repeat
 */
export type ReminderFrequency = 'once' | 'daily' | 'weekly';

/**
 * Reminder Model
 * Represents a scheduled reminder with optional recurrence
 */
export interface ReminderModel {
  id: number;
  message: string;
  time: string; // Format: "HH:mm" (24-hour)
  frequency: ReminderFrequency;
  day_of_week?: number | null; // 0-6 (Sunday-Saturday), null for non-weekly reminders
  channel_id: string;
  user_id: string;
  guild_id: string;
  active: boolean;
  next_trigger?: Date | null;
}

/**
 * Budget Model
 * Represents a budget entry (if used in frontend)
 */
export interface BudgetModel {
  id: number;
  category: string;
  amount: number;
  user_id: string;
  guild_id: string;
  created_at: Date;
}

/**
 * Note Model
 * Represents a note entry (if used in frontend)
 */
export interface NoteModel {
  id: number;
  title: string;
  content: string;
  user_id: string;
  guild_id: string;
  created_at: Date;
  updated_at?: Date | null;
}

/**
 * Schedule Model
 * Represents a scheduled event (if used in frontend)
 */
export interface ScheduleModel {
  id: number;
  event_name: string;
  event_time: Date;
  description?: string | null;
  user_id: string;
  guild_id: string;
  created_at: Date;
}

/**
 * User Model
 * Represents a Discord user in the system
 */
export interface UserModel {
  id: number;
  discord_id: string;
  username: string;
  email?: string | null;
  guild_id: string;
  created_at: Date;
}
