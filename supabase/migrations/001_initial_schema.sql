-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  source_platform TEXT NOT NULL CHECK (source_platform IN ('instagram', 'facebook', 'tiktok', 'youtube')),
  video_embed_url TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  extraction_status TEXT NOT NULL DEFAULT 'complete' CHECK (extraction_status IN ('complete', 'partial', 'failed')),
  steps JSONB NOT NULL DEFAULT '[]',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT
);

-- Full-text search index
CREATE INDEX idx_recipes_search ON recipes USING GIN (search_vector);

-- Trigram index on ingredient canonical_name for fuzzy matching
CREATE INDEX idx_ingredients_canonical_trgm ON ingredients USING GIN (canonical_name gin_trgm_ops);

-- Index for recipe lookups by ingredient
CREATE INDEX idx_ingredients_recipe_id ON ingredients (recipe_id);

-- Index for source_url uniqueness checks
CREATE INDEX idx_recipes_source_url ON recipes (source_url);

-- Index for category filtering
CREATE INDEX idx_recipes_categories ON recipes USING GIN (categories);

-- Function to update search_vector from recipe data + ingredients
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := (
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(
      (SELECT string_agg(name, ' ') FROM ingredients WHERE recipe_id = NEW.id), ''
    )), 'B') ||
    setweight(to_tsvector('simple', COALESCE(
      (SELECT string_agg(value, ' ') FROM jsonb_array_elements_text(NEW.steps)), ''
    )), 'C')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search_vector in sync
CREATE TRIGGER trg_recipes_search_vector
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_search_vector();

-- Function to refresh search vector when ingredients change
CREATE OR REPLACE FUNCTION refresh_recipe_search_on_ingredient_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Touch the recipe to re-trigger its search vector update
  UPDATE recipes SET title = title WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ingredients_search_refresh
  AFTER INSERT OR UPDATE OR DELETE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION refresh_recipe_search_on_ingredient_change();
