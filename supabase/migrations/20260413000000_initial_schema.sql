-- =============================================================================
-- Bwaincell Initial Schema Migration
-- =============================================================================
-- Creates all tables matching the application models.
-- Migrated from Sequelize ORM to Supabase.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Timezone
SET timezone = 'America/Los_Angeles';

-- =============================================================================
-- ENUM Types
-- =============================================================================

CREATE TYPE reminder_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE budget_type AS ENUM ('expense', 'income');

-- =============================================================================
-- Tables
-- =============================================================================

-- Users (Google OAuth + Discord mapping)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  picture VARCHAR(255),
  discord_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL
);

-- Lists (items stored as JSONB array)
CREATE TABLE IF NOT EXISTS lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminders (recurring/one-time with timezone-aware scheduling)
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  time TIME NOT NULL,
  frequency reminder_frequency NOT NULL DEFAULT 'once',
  day_of_week INTEGER,
  day_of_month INTEGER,
  month INTEGER,
  channel_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  next_trigger TIMESTAMPTZ
);

-- Budgets (expense/income tracking)
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  type budget_type NOT NULL,
  category VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL
);

-- Schedules (events calendar)
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  event VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  description TEXT,
  user_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Configs (per-guild local events discovery settings)
CREATE TABLE IF NOT EXISTS event_configs (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  announcement_channel_id VARCHAR(255) NOT NULL,
  schedule_day INTEGER NOT NULL DEFAULT 1,
  schedule_hour INTEGER NOT NULL DEFAULT 12,
  schedule_minute INTEGER NOT NULL DEFAULT 0,
  timezone VARCHAR(255) NOT NULL DEFAULT 'America/Los_Angeles',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_announcement TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sunset Configs (per-guild sunset announcement settings)
CREATE TABLE IF NOT EXISTS sunset_configs (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  advance_minutes INTEGER NOT NULL DEFAULT 60,
  channel_id VARCHAR(255) NOT NULL,
  zip_code VARCHAR(255) NOT NULL,
  timezone VARCHAR(255) NOT NULL DEFAULT 'America/Los_Angeles',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_announcement TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Tasks: filter by guild, completion status
CREATE INDEX IF NOT EXISTS idx_tasks_guild_id ON tasks (guild_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);
CREATE INDEX IF NOT EXISTS idx_tasks_guild_completed ON tasks (guild_id, completed);

-- Notes: filter by guild
CREATE INDEX IF NOT EXISTS idx_notes_guild_id ON notes (guild_id);

-- Lists: filter by guild
CREATE INDEX IF NOT EXISTS idx_lists_guild_id ON lists (guild_id);

-- Reminders: active reminders, trigger time
CREATE INDEX IF NOT EXISTS idx_reminders_guild_id ON reminders (guild_id);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders (active);
CREATE INDEX IF NOT EXISTS idx_reminders_next_trigger ON reminders (next_trigger) WHERE active = TRUE;

-- Budgets: filter by guild, type, date
CREATE INDEX IF NOT EXISTS idx_budgets_guild_id ON budgets (guild_id);
CREATE INDEX IF NOT EXISTS idx_budgets_type ON budgets (type);
CREATE INDEX IF NOT EXISTS idx_budgets_date ON budgets (date);

-- Schedules: filter by guild, date
CREATE INDEX IF NOT EXISTS idx_schedules_guild_id ON schedules (guild_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date);

-- Event Configs: enabled configs
CREATE INDEX IF NOT EXISTS idx_event_configs_is_enabled ON event_configs (is_enabled);

-- Sunset Configs: enabled configs
CREATE INDEX IF NOT EXISTS idx_sunset_configs_is_enabled ON sunset_configs (is_enabled);

-- Users: lookup by email, google_id
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
