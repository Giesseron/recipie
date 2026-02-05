-- Migration: Add authentication support
-- IMPORTANT: This deletes all existing recipes (pre-launch data)
-- before adding the user_id NOT NULL constraint.

-- 1. Delete existing data (no user_id to assign)
DELETE FROM ingredients;
DELETE FROM recipes;

-- 2. Add user_id column to recipes
ALTER TABLE recipes ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Replace global source_url uniqueness with per-user uniqueness
ALTER TABLE recipes DROP CONSTRAINT recipes_source_url_key;
ALTER TABLE recipes ADD CONSTRAINT recipes_user_source_url_unique UNIQUE (user_id, source_url);

-- 4. Index for user_id lookups
CREATE INDEX idx_recipes_user_id ON recipes (user_id);

-- 5. Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for recipes
CREATE POLICY "Users can view their own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS policies for ingredients (via recipe ownership)
CREATE POLICY "Users can view ingredients of their own recipes"
  ON ingredients FOR SELECT
  USING (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert ingredients for their own recipes"
  ON ingredients FOR INSERT
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete ingredients of their own recipes"
  ON ingredients FOR DELETE
  USING (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
