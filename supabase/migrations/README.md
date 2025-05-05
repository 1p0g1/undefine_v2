# Supabase Migrations

This directory contains all database migrations for the Un-Define v2 project. Migrations are applied in sequence to ensure database schema consistency across all environments.

## Migration Format

Migration files follow this naming convention:

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20230515143000_add_clue_fields_to_words.sql`

## Migration Strategy

### Application Order

1. Migrations are applied in strict timestamp order
2. Never modify an existing migration file after it has been applied to any environment
3. Always create a new migration file for schema changes

### Types of Changes

#### Schema Migrations

- Table creation
- Column additions/modifications/deletions
- Index creation/deletion
- Constraint additions/modifications
- Function creation/modification
- RLS policy changes

#### Data Migrations

- Initial seed data
- Reference data updates
- Data transformations

### Migration Guidelines

1. **Atomic Changes**: Each migration should represent a single logical change
2. **Idempotent**: Migrations should be safe to run multiple times
3. **Reversible**: Include down migrations where possible
4. **Versioned**: Always include a version comment at the top of the file
5. **Documented**: Include comments explaining the purpose of the migration

## Example Migration

```sql
-- Migration: 20230515143000_add_clue_fields_to_words
-- Description: Add DEFINE clue fields to words table
-- Author: Project Team
-- Date: 2023-05-15

-- Up migration
ALTER TABLE words
  ADD COLUMN equivalents TEXT,
  ADD COLUMN first_letter TEXT,
  ADD COLUMN in_a_sentence TEXT,
  ADD COLUMN number_of_letters INT,
  ADD COLUMN etymology TEXT,
  ADD COLUMN difficulty TEXT;

-- Down migration
ALTER TABLE words
  DROP COLUMN equivalents,
  DROP COLUMN first_letter,
  DROP COLUMN in_a_sentence,
  DROP COLUMN number_of_letters,
  DROP COLUMN etymology,
  DROP COLUMN difficulty;
```

## Applying Migrations

Migrations are applied using the Supabase CLI:

```bash
# Apply all pending migrations
supabase db push

# Apply migrations to a specific environment
supabase db push --db-url <DATABASE_URL>
```

## Migration Testing

Before committing a migration:

1. Test the migration locally
2. Verify the down migration works correctly
3. Check for potential data loss
4. Ensure indexes are created for performance-critical queries

## Migration History

Migration history is tracked in the `supabase_migrations` table in the database. This table is automatically managed by Supabase and should not be modified manually.
