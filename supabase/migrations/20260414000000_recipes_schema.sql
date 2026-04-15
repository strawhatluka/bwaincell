-- =============================================================================
-- Bwaincell Recipes Schema Migration
-- =============================================================================
-- Adds: recipes, meal_plans, recipe_preferences tables.
-- Shared per guild (household-level access); user_id stored for audit.
-- =============================================================================

-- Enums
CREATE TYPE recipe_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE recipe_source_type AS ENUM ('website', 'video', 'file', 'manual');

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  source_url TEXT,
  source_type recipe_source_type NOT NULL DEFAULT 'manual',
  ingredients JSONB NOT NULL,                               -- [{ name, quantity, unit, category }]
  instructions JSONB NOT NULL,                              -- string[]
  servings INTEGER,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  nutrition JSONB,                                          -- { calories, protein, carbs, fat, fiber, sugar, sodium }
  cuisine VARCHAR(100),
  difficulty recipe_difficulty,
  dietary_tags JSONB NOT NULL DEFAULT '[]'::jsonb,          -- ["vegetarian","gluten-free",...]
  image_url TEXT,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,                            -- audit trail
  guild_id VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_guild_id ON recipes (guild_id);
CREATE INDEX IF NOT EXISTS idx_recipes_guild_favorite ON recipes (guild_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes (cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes (difficulty);

-- ---------------------------------------------------------------------------
-- Meal Plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  recipe_ids INTEGER[] NOT NULL,                            -- length 7
  servings_per_recipe INTEGER[] NOT NULL,                   -- length 7, parallel
  week_start DATE NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL,                            -- audit trail (who last edited)
  guild_id VARCHAR(255) NOT NULL
);

-- Exactly one active meal plan per guild
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_guild_active
  ON meal_plans (guild_id) WHERE archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_meal_plans_guild_archived
  ON meal_plans (guild_id, archived, created_at DESC);

-- ---------------------------------------------------------------------------
-- Recipe Preferences (per guild)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipe_preferences (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(255) NOT NULL UNIQUE,
  dietary_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["vegetarian","gluten-free",...]
  excluded_cuisines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255) NOT NULL                             -- audit trail
);
