Database Schema

This document defines the database schema for the Un-Define v2 project. The project uses Supabase as the database provider.

Tables

words

Stores the words that can be used in the game.

CREATE TABLE words (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
word TEXT NOT NULL UNIQUE,
definition TEXT NOT NULL,
equivalents TEXT,
first_letter TEXT,
in_a_sentence TEXT,
number_of_letters INT,
etymology TEXT,
difficulty TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
is_word_of_day BOOLEAN DEFAULT FALSE,
word_of_day_date DATE
);

CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_word_of_day_date ON words(word_of_day_date);

game_sessions

Stores information about each game session.

CREATE TABLE game_sessions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
player_id TEXT NOT NULL,
word_id UUID NOT NULL REFERENCES words(id),
word TEXT NOT NULL,
guesses TEXT[] DEFAULT '{}',
revealed_clues BOOLEAN[] DEFAULT '{}',
used_hint BOOLEAN DEFAULT FALSE,
clue_status JSONB DEFAULT '{"D": false, "E": false, "F": false, "I": false, "N": false, "E2": false}'::jsonb,
is_complete BOOLEAN DEFAULT FALSE,
is_won BOOLEAN DEFAULT FALSE,
start_time TIMESTAMP WITH TIME ZONE NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
completed_at TIMESTAMP WITH TIME ZONE,
UNIQUE(player_id, word_id)
);

CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_word_id ON game_sessions(word_id);
CREATE INDEX idx_game_sessions_start_time ON game_sessions(start_time);

user_stats

Stores statistics for each player.

CREATE TABLE user_stats (
player_id TEXT PRIMARY KEY,
games_played INTEGER DEFAULT 0,
games_won INTEGER DEFAULT 0,
current_streak INTEGER DEFAULT 0,
longest_streak INTEGER DEFAULT 0,
total_guesses INTEGER DEFAULT 0,
average_guesses_per_game FLOAT DEFAULT 0,
average_completion_time FLOAT DEFAULT 0,
fastest_win_seconds INTEGER,
total_play_time_seconds INTEGER DEFAULT 0,
last_played_word TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_stats_games_played ON user_stats(games_played);

scores

Stores scores for each game session.

CREATE TABLE scores (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
player_id TEXT NOT NULL,
word_id UUID NOT NULL REFERENCES words(id),
guesses_used INTEGER NOT NULL,
used_hint BOOLEAN DEFAULT FALSE,
completion_time_seconds INTEGER NOT NULL,
correct BOOLEAN DEFAULT FALSE,
score INTEGER NOT NULL,
base_score INTEGER NOT NULL,
guess_penalty INTEGER NOT NULL,
time_penalty INTEGER NOT NULL,
hint_penalty INTEGER NOT NULL,
nickname TEXT,
submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(player_id, word_id)
);

CREATE INDEX idx_scores_player_id ON scores(player_id);
CREATE INDEX idx_scores_word_id ON scores(word_id);
CREATE INDEX idx_scores_submitted_at ON scores(submitted_at);
CREATE INDEX idx_scores_score ON scores(score DESC);

leaderboard_summary

Stores summary information for the leaderboard.

CREATE TABLE leaderboard_summary (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
player_id TEXT NOT NULL,
word_id UUID NOT NULL REFERENCES words(id),
rank INTEGER NOT NULL,
was_top_10 BOOLEAN DEFAULT FALSE,
score INTEGER NOT NULL,
completion_time_seconds INTEGER NOT NULL,
guesses_used INTEGER NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(player_id, word_id)
);

CREATE INDEX idx_leaderboard_summary_player_id ON leaderboard_summary(player_id);
CREATE INDEX idx_leaderboard_summary_word_id ON leaderboard_summary(word_id);
CREATE INDEX idx_leaderboard_summary_rank ON leaderboard_summary(rank);
CREATE INDEX idx_leaderboard_summary_score ON leaderboard_summary(score DESC);

TypeScript Types

interface WordEntry {
id: string;
word: string;
definition: string;
equivalents?: string | null;
first_letter?: string | null;
in_a_sentence?: string | null;
number_of_letters?: number | null;
etymology?: string | null;
difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
created_at: string;
is_word_of_day: boolean;
word_of_day_date?: string | null;
}

interface GameSessionEntry {
id: string;
word_id: string;
player_id: string;
word: string;
guesses: string[];
revealed_clues: boolean[];
used_hint: boolean;
clue_status: Record<string, boolean>;
is_complete: boolean;
is_won: boolean;
start_time: string;
created_at: string;
completed_at?: string | null;
}

interface ScoreEntry {
id: string;
player_id: string;
word_id: string;
guesses_used: number;
used_hint: boolean;
completion_time_seconds: number;
correct: boolean;
score: number;
base_score: number;
guess_penalty: number;
time_penalty: number;
hint_penalty: number;
nickname?: string | null;
submitted_at: string;
}

interface UserStatsEntry {
player_id: string;
games_played: number;
games_won: number;
current_streak: number;
longest_streak: number;
average_guesses: number;
average_completion_time: number;
fastest_win_seconds?: number | null;
total_play_time_seconds: number;
last_played_word?: string | null;
created_at: string;
updated_at: string;
}

interface LeaderboardSummaryEntry {
id: string;
player_id: string;
word_id: string;
rank: number;
was_top_10: boolean;
score: number;
completion_time_seconds: number;
guesses_used: number;
created_at: string;
}

Database Functions

get_word_of_day() — returns today's daily word.

has_played_today(player_id) — checks if a player has already played.

get_leaderboard_for_word(word_id, limit_count) — returns sorted leaderboard results by completion time, then hint usage.

Policies & RLS

RLS (Row Level Security) is documented and planned but not yet fully enabled.

See docs/ARCHITECTURE.md for intended access policies.

Migrations

All SQL migrations are versioned using the format:

YYYYMMDDHHMMSS_description.sql

See supabase/migrations/README.md for full migration strategy and conventions.

Backups

Supabase handles daily backups

You can restore using the dashboard's point-in-time recovery

Performance Notes

Indexes applied to all key search columns

Batch updates used for leaderboard logic

Future improvements: cron-based cleanup of old sessions/scores
