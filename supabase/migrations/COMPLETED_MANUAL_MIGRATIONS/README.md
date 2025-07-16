# Completed Manual Migrations

This directory contains SQL migration files that have been **manually applied** to the Supabase database via the SQL Editor.

⚠️ **IMPORTANT**: These migrations have already been executed and should **NOT** be run again via CLI.

## Process for Manual Migrations

1. **Create migration file** in main `migrations/` directory
2. **Apply manually** via Supabase SQL Editor
3. **Verify success** in production database
4. **Move file here** to prevent re-execution
5. **Record in** `MIGRATION_SUCCESS_LOG.md`

## Files in This Directory

### `20250115000001_add_similarity_tracking_to_theme_attempts.sql`
- **Applied**: January 15, 2025
- **Purpose**: Add similarity score tracking to theme attempts
- **Status**: ✅ COMPLETED - Added similarity_score, confidence_percentage, and matching_method columns

---

**Note**: These files are kept for reference and documentation purposes only. They should not be executed again. 