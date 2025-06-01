-- Migration: 20241202000002_fix_leaderboard_summary_player_fk.sql
-- Description: Correct the foreign key for leaderboard_summary.player_id
--              to reference user_stats(player_id) instead of players(id).
-- Author: AI Assistant
-- Date: 2024-12-02

-- Step 1: Drop the existing incorrect foreign key constraint if it exists.
-- The constraint name might vary. We'll try to find it by looking for FKs on player_id referencing players.
DO $$
DECLARE
    constraint_name_to_drop TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name_to_drop
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'leaderboard_summary'
      AND kcu.column_name = 'player_id'
      AND ccu.table_name = 'players' -- The table it currently (incorrectly) references
      AND ccu.column_name = 'id'
    LIMIT 1;

    IF constraint_name_to_drop IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.leaderboard_summary DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_to_drop);
        RAISE NOTICE 'Dropped foreign key constraint: % from leaderboard_summary.player_id referencing players.id', constraint_name_to_drop;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on leaderboard_summary.player_id referencing players.id to drop.';
    END IF;
END $$;

-- Step 2: Add the correct foreign key constraint to user_stats(player_id)
-- (Ensuring it allows ON DELETE CASCADE as per original good migrations)
ALTER TABLE public.leaderboard_summary
ADD CONSTRAINT fk_leaderboard_summary_player_id_to_user_stats
    FOREIGN KEY (player_id)
    REFERENCES public.user_stats(player_id)
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_leaderboard_summary_player_id_to_user_stats ON public.leaderboard_summary IS 'Ensures player_id in leaderboard_summary correctly references a valid player_id in user_stats.'; 