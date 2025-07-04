# ARCHIVED UNNECESSARY MIGRATIONS

## ⚠️ WARNING
These migrations have been moved here because they are **UNNECESSARY** and would create redundant database structures.

## Why These Migrations Are Unnecessary

### `20240617000001_add_current_week_theme_data.sql`
**Problem**: Creates redundant `current_week_theme_data` table

**Why Unnecessary**:
1. **`words` table already has `theme` column** - stores theme for each word
2. **Theme system works by querying `words` table** - no additional metadata needed
3. **Theme feature is already working** - user confirmed functionality
4. **Additional table adds complexity** without providing value

**Current Implementation**:
- Themes stored in `words.theme` column
- Weekly themes calculated by querying words for current week
- `theme_attempts` table tracks player guesses
- No metadata table needed

## Current Correct State

The theme system uses:
- `words.theme` column for storing themes
- `theme_attempts` table for tracking guesses
- Theme calculation functions in `src/game/theme.ts`

## For Fresh Installations

**Skip this migration completely** - the theme system works without it.

## Lessons Learned

1. **Review existing schema before creating new tables**
2. **Understand current implementation before adding features**
3. **Avoid redundant data structures**
4. **Test existing functionality before assuming missing pieces** 