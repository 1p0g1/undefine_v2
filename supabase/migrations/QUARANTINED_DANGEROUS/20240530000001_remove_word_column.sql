-- Migration: 20240530000001_remove_word_column
-- Description: Remove the word column from game_sessions since we're using foreign key relationship
-- Author: Project Team
-- Date: 2024-05-30

-- Up migration
ALTER TABLE game_sessions DROP COLUMN IF EXISTS word;

-- Down migration
ALTER TABLE game_sessions ADD COLUMN word TEXT; 