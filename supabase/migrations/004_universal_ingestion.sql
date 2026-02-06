-- Migration: Universal ingestion support
-- Adds website + upload platforms, allows NULL source_url for uploads

-- Allow new platform values
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_platform_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_source_platform_check
  CHECK (source_platform IN ('instagram','facebook','tiktok','youtube','website','upload'));

-- Allow NULL source_url (photo uploads have no URL)
ALTER TABLE recipes ALTER COLUMN source_url DROP NOT NULL;

-- Replace unique constraint with partial index (allows multiple NULL uploads)
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_user_source_url_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_user_source_url
  ON recipes (user_id, source_url) WHERE source_url IS NOT NULL;
