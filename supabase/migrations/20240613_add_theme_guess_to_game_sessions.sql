-- Add a nullable theme_guess column to game_sessions for theme guessing feature
ALTER TABLE game_sessions ADD COLUMN theme_guess TEXT; 