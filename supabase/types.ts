/**
 * Supabase Database Types
 * Matches existing PostgreSQL schema from Sequelize models.
 */

// ============ Row Types (what comes back from queries) ============

export interface TaskRow {
  id: number;
  description: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  guild_id: string;
}

export interface TaskInsert {
  description: string;
  due_date?: string | null;
  completed?: boolean;
  created_at?: string;
  completed_at?: string | null;
  user_id: string;
  guild_id: string;
}

export interface TaskUpdate {
  description?: string;
  due_date?: string | null;
  completed?: boolean;
  completed_at?: string | null;
}

export interface NoteRow {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  guild_id: string;
}

export interface NoteInsert {
  title: string;
  content: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  user_id: string;
  guild_id: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  tags?: string[];
  updated_at?: string;
}

export interface ListItem {
  text: string;
  completed: boolean;
  added_at: string;
}

export interface ListRow {
  id: number;
  name: string;
  items: ListItem[];
  user_id: string;
  guild_id: string;
  created_at: string;
}

export interface ListInsert {
  name: string;
  items?: ListItem[];
  user_id: string;
  guild_id: string;
  created_at?: string;
}

export interface ListUpdate {
  name?: string;
  items?: ListItem[];
}

export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReminderRow {
  id: number;
  message: string;
  time: string;
  frequency: ReminderFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  month: number | null;
  channel_id: string;
  user_id: string;
  guild_id: string;
  active: boolean;
  next_trigger: string | null;
}

export interface ReminderInsert {
  message: string;
  time: string;
  frequency?: ReminderFrequency;
  day_of_week?: number | null;
  day_of_month?: number | null;
  month?: number | null;
  channel_id: string;
  user_id: string;
  guild_id: string;
  active?: boolean;
  next_trigger?: string | null;
}

export interface ReminderUpdate {
  message?: string;
  time?: string;
  frequency?: ReminderFrequency;
  day_of_week?: number | null;
  day_of_month?: number | null;
  month?: number | null;
  active?: boolean;
  next_trigger?: string | null;
}

export type BudgetType = 'expense' | 'income';

export interface BudgetRow {
  id: number;
  type: BudgetType;
  category: string | null;
  amount: number;
  description: string | null;
  date: string;
  user_id: string;
  guild_id: string;
}

export interface BudgetInsert {
  type: BudgetType;
  category?: string | null;
  amount: number;
  description?: string | null;
  date?: string;
  user_id: string;
  guild_id: string;
}

export interface BudgetUpdate {
  type?: BudgetType;
  category?: string | null;
  amount?: number;
  description?: string | null;
  date?: string;
}

export interface ScheduleRow {
  id: number;
  event: string;
  date: string;
  time: string;
  description: string | null;
  user_id: string;
  guild_id: string;
  created_at: string;
}

export interface ScheduleInsert {
  event: string;
  date: string;
  time: string;
  description?: string | null;
  user_id: string;
  guild_id: string;
  created_at?: string;
}

export interface UserRow {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string | null;
  discord_id: string;
  guild_id: string;
  refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  google_id: string;
  email: string;
  name: string;
  picture?: string | null;
  discord_id: string;
  guild_id: string;
  refresh_token?: string | null;
}

export interface UserUpdate {
  name?: string;
  picture?: string | null;
  refresh_token?: string | null;
  updated_at?: string;
}

export interface EventConfigRow {
  id: number;
  guild_id: string;
  user_id: string;
  location: string;
  announcement_channel_id: string;
  schedule_day: number;
  schedule_hour: number;
  schedule_minute: number;
  timezone: string;
  is_enabled: boolean;
  last_announcement: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventConfigInsert {
  guild_id: string;
  user_id: string;
  location: string;
  announcement_channel_id: string;
  schedule_day?: number;
  schedule_hour?: number;
  schedule_minute?: number;
  timezone?: string;
  is_enabled?: boolean;
  last_announcement?: string | null;
}

export interface EventConfigUpdate {
  location?: string;
  announcement_channel_id?: string;
  schedule_day?: number;
  schedule_hour?: number;
  schedule_minute?: number;
  timezone?: string;
  is_enabled?: boolean;
  last_announcement?: string | null;
  updated_at?: string;
}

export interface SunsetConfigRow {
  id: number;
  guild_id: string;
  user_id: string;
  advance_minutes: number;
  channel_id: string;
  zip_code: string;
  timezone: string;
  is_enabled: boolean;
  last_announcement: string | null;
  created_at: string;
  updated_at: string;
}

export interface SunsetConfigInsert {
  guild_id: string;
  user_id: string;
  advance_minutes?: number;
  channel_id: string;
  zip_code: string;
  timezone?: string;
  is_enabled?: boolean;
  last_announcement?: string | null;
}

export interface SunsetConfigUpdate {
  advance_minutes?: number;
  channel_id?: string;
  zip_code?: string;
  timezone?: string;
  is_enabled?: boolean;
  last_announcement?: string | null;
  updated_at?: string;
}

// ============ Supabase Database Type Definition ============

export interface ScheduleUpdate {
  event?: string;
  date?: string;
  time?: string;
  description?: string | null;
}

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: TaskRow;
        Insert: TaskInsert;
        Update: TaskUpdate;
        Relationships: [];
      };
      notes: {
        Row: NoteRow;
        Insert: NoteInsert;
        Update: NoteUpdate;
        Relationships: [];
      };
      lists: {
        Row: ListRow;
        Insert: ListInsert;
        Update: ListUpdate;
        Relationships: [];
      };
      reminders: {
        Row: ReminderRow;
        Insert: ReminderInsert;
        Update: ReminderUpdate;
        Relationships: [];
      };
      budgets: {
        Row: BudgetRow;
        Insert: BudgetInsert;
        Update: BudgetUpdate;
        Relationships: [];
      };
      schedules: {
        Row: ScheduleRow;
        Insert: ScheduleInsert;
        Update: ScheduleUpdate;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      event_configs: {
        Row: EventConfigRow;
        Insert: EventConfigInsert;
        Update: EventConfigUpdate;
        Relationships: [];
      };
      sunset_configs: {
        Row: SunsetConfigRow;
        Insert: SunsetConfigInsert;
        Update: SunsetConfigUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reminder_frequency: ReminderFrequency;
      budget_type: BudgetType;
    };
  };
}
