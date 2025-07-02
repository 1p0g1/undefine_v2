# Documentation Consolidation Rules
*Established: July 2, 2025*
*Purpose: Prevent outdated documentation from causing debugging failures*

## 🎯 **PRIMARY RULE: VERIFY BEFORE TRUST**

**Before using ANY database documentation:**
1. ✅ **Screenshot verification** - Check actual Supabase table data
2. ✅ **SQL script testing** - Run on small dataset first
3. ✅ **Column existence check** - Verify all referenced columns exist
4. ✅ **Update PRIMARY docs** - Fix any discrepancies found

## 📋 **DOCUMENTATION HIERARCHY**

### **🥇 TIER 1: PRIMARY SOURCES OF TRUTH**
*These documents are actively maintained and verified against actual database state*

1. **`docs/CRITICAL_DATABASE_ANALYSIS_JULY_2025.md`**
   - **Status**: ✅ ACTIVE - Primary source of truth
   - **Content**: Actual table usage, verified data flows
   - **Last Verified**: July 2, 2025 via screenshots
   - **Update Rule**: Must be updated whenever database changes are made

2. **`docs/ACTUAL_DATABASE_SCHEMA.md`**
   - **Status**: ✅ ACTIVE - Schema reference
   - **Content**: Verified table structures and relationships
   - **Last Verified**: July 2, 2025 via types.ts and migrations
   - **Update Rule**: Update when new tables/columns are added

### **🥈 TIER 2: IMPLEMENTATION GUIDES**
*These documents are for planning and implementation, not database facts*

3. **`docs/LEADERBOARD_SYSTEM_REDESIGN_PROPOSAL.md`**
   - **Status**: ✅ ACTIVE - Implementation planning
   - **Content**: Proposed changes and fixes
   - **Dependency**: Must reference Tier 1 documents for current state

### **🚫 TIER 3: DEPRECATED DOCUMENTS**
*These documents contain outdated information and should NOT be used*

4. **`docs/database_schema.md`**
   - **Status**: ❌ DEPRECATED - Contains false assumptions
   - **Issues**: Assumes user_stats is populated (it's not)
   - **Action Required**: Mark as deprecated, add warning header

5. **Any docs referencing user_stats as active data source**
   - **Status**: ❌ DEPRECATED
   - **Reason**: user_stats table is not being populated

## 🔍 **VERIFICATION CHECKLIST**

### **Before Using Database Documentation:**

#### **Step 1: Table Existence Check**
```sql
-- Verify table exists and has data
SELECT COUNT(*) FROM table_name LIMIT 1;
```

#### **Step 2: Column Existence Check**
```sql
-- Check if columns referenced in docs actually exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'your_table' 
  AND column_name IN ('col1', 'col2', 'col3');
```

#### **Step 3: Data Population Check**
```sql
-- Verify table is actually being used
SELECT COUNT(*) as total_rows,
       COUNT(CASE WHEN important_column IS NOT NULL THEN 1 END) as populated_rows
FROM table_name;
```

#### **Step 4: Foreign Key Validation**
```sql
-- Check if foreign key relationships actually work
SELECT COUNT(*) 
FROM parent_table p 
LEFT JOIN child_table c ON p.id = c.parent_id 
WHERE c.parent_id IS NULL;
```

## 📝 **DOCUMENTATION UPDATE PROCESS**

### **When Database Changes Are Made:**

1. **Update Tier 1 documents FIRST**
   - Verify changes work in production
   - Update schema documentation
   - Add screenshots if significant changes

2. **Update investigation scripts**
   - Test all SQL scripts with new schema
   - Fix any column/table references
   - Verify scripts return expected results

3. **Mark deprecated docs**
   - Add deprecation warnings to outdated files
   - Reference the new authoritative documents
   - Set removal date if appropriate

### **Weekly Verification Process:**

1. **Random table checks** - Verify 2-3 tables match documentation
2. **Script testing** - Run investigation scripts to ensure they work
3. **Documentation review** - Check for inconsistencies between docs

## 🚨 **RED FLAGS - IMMEDIATE VERIFICATION NEEDED**

If you encounter any of these, stop and verify:

1. **SQL script failures** with "column does not exist" errors
2. **Empty result sets** from tables expected to have data
3. **Foreign key constraint errors** in working systems
4. **Discrepancies** between documented and actual behavior
5. **References to user_stats** as active data source

## 🎯 **SPECIFIC RULES FOR UNDEFINE V2**

### **Verified Facts (as of July 2, 2025):**

#### **✅ Tables Actually Used:**
- `players` - Player identity
- `game_sessions` - Game records  
- `leaderboard_summary` - Daily rankings
- `player_streaks` - Streak tracking (partially working)
- `words` - Game content

#### **❌ Tables NOT Used:**
- `user_stats` - Completely empty despite documentation
- `scores` - Usage unknown, needs verification
- `trigger_log` - May not exist

#### **⚠️ Known Issues:**
- `player_streaks` trigger logic is broken
- Foreign key references inconsistent
- Some documented columns don't exist

### **Investigation Script Rules:**

1. **Never assume columns exist** - check schema first
2. **Test on single record** before running on full dataset  
3. **Use actual player IDs** from verified sources
4. **Include error handling** for missing tables/columns

### **API Development Rules:**

1. **Don't use user_stats** - it's not populated
2. **Calculate stats from game_sessions** and leaderboard_summary
3. **Verify foreign key relationships** before implementing
4. **Test with actual production data** before deployment

## 🔧 **IMMEDIATE ACTIONS REQUIRED**

1. **Mark database_schema.md as DEPRECATED**
2. **Update all investigation scripts** to use verified schema
3. **Fix player_streaks trigger** to properly calculate streaks
4. **Verify scores table usage** - determine if it can be removed
5. **Create new Supabase types** that include missing tables

This consolidation ensures we never again debug based on incorrect assumptions about our database structure. 