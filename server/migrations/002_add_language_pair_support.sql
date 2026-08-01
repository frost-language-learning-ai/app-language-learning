-- Migration: Add language pair support to core_terms
-- This migration adds source_lang and target_lang columns to support multiple language pairs

-- Add new columns
ALTER TABLE core_terms 
ADD COLUMN IF NOT EXISTS source_lang VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS target_lang VARCHAR(10) DEFAULT 'de';

-- Update existing records to have explicit language codes
UPDATE core_terms SET source_lang = 'en', target_lang = 'de' WHERE source_lang IS NULL OR target_lang IS NULL;

-- Make the columns NOT NULL after setting defaults
ALTER TABLE core_terms 
ALTER COLUMN source_lang SET NOT NULL,
ALTER COLUMN target_lang SET NOT NULL;

-- Drop old unique constraint
ALTER TABLE core_terms DROP CONSTRAINT IF EXISTS uq_core_terms_pair;

-- Add new unique constraint including language pair
ALTER TABLE core_terms 
ADD CONSTRAINT uq_core_terms_lang_pair UNIQUE (term_en, term_de, source_lang, target_lang);

-- Create index for faster filtering by language pair
CREATE INDEX IF NOT EXISTS idx_core_terms_lang_pair ON core_terms (source_lang, target_lang, created_at DESC);
