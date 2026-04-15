-- =============================================================================
-- Bwaincell Database Initialization Script
-- =============================================================================
-- PostgreSQL 15
-- This script runs automatically when the PostgreSQL container first starts
-- Sequelize will create tables via migrations after initialization
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PostgreSQL Extensions
-- -----------------------------------------------------------------------------

-- UUID generation support (for future use with UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Text search optimization (trigram matching for fast LIKE queries)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- Timezone Configuration
-- -----------------------------------------------------------------------------
-- Set timezone for reminder functionality (America/Los_Angeles = PST/PDT)
SET timezone = 'America/Los_Angeles';

-- -----------------------------------------------------------------------------
-- User Privileges
-- -----------------------------------------------------------------------------
-- Grant application user full access to the database
GRANT ALL PRIVILEGES ON DATABASE bwaincell TO bwaincell;

-- -----------------------------------------------------------------------------
-- Initialization Complete
-- -----------------------------------------------------------------------------
-- Database initialized successfully
-- Sequelize will create tables (tasks, lists, notes, reminders, budgets, schedules, users)
-- via sync() or migrations on first bot startup
-- =============================================================================
