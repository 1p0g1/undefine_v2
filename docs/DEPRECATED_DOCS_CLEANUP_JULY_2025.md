# Documentation Cleanup Plan - July 2, 2025

## 🎯 **CLEANUP STRATEGY**

Following our **TIER 1 verification system**, we need to remove/archive documents with outdated schema information and mark completed migrations.

---

## 📋 **TIER 3 DOCUMENTS - MARK FOR DEPRECATION**

### **1. `docs/database_schema.md`** ❌ **DEPRECATED**
**Issues Found**:
- References `user_stats` as active data source (it's abandoned - all zeros)
- Uses wrong column names: `longest_streak` vs `highest_streak`
- Contains outdated ERD assumptions
- States "user_stats is populated" (FALSE - verified empty via screenshots)

**Action**: Add deprecation header, redirect to TIER 1 docs

### **2. `docs/supa_alignment.md`** ❌ **PARTIALLY DEPRECATED**  
**Issues Found**:
- References `user_stats` as primary data source
- Missing `player_streaks` and `theme_attempts` tables
- Outdated foreign key assumptions
- Column name mismatches

**Action**: Mark sections as deprecated, update with TIER 1 references

### **3. `docs/MAY_2025_SCHEMA_ALIGNMENT.md`** ❌ **DEPRECATED**
**Issues Found**:
- Based on incorrect schema assumptions
- Claims leaderboard issues are "resolved" (they weren't)
- References non-existent columns

**Action**: Archive to `docs/archived/` folder

---

## 📋 **TIER 2 DOCUMENTS - UPDATE REFERENCES**

### **4. `docs/mvp.md`** ⚠️ **NEEDS UPDATES**
**Issues Found**:
- References deprecated `docs/supa_alignment.md` for schema
- Contains outdated database flow assumptions

**Action**: Update references to point to TIER 1 docs

### **5. `docs/LEADERBOARD_TROUBLESHOOTING.md`** ⚠️ **NEEDS UPDATES**
**Issues Found**:
- Contains SQL queries with wrong column names
- References non-existent `trigger_log` columns
- Based on outdated schema assumptions

**Action**: Update SQL queries with verified schema

---

## 📋 **TIER 1 DOCUMENTS - KEEP AS PRIMARY**

### **6. `docs/CRITICAL_DATABASE_ANALYSIS_JULY_2025.md`** ✅ **KEEP**
- Screenshot-verified facts
- Actual table usage analysis
- Primary source of truth

### **7. `docs/ACTUAL_DATABASE_SCHEMA.md`** ✅ **KEEP**  
- Verified schema structures
- Includes missing tables from types.ts
- Based on actual migrations

### **8. `docs/DOCUMENTATION_CONSOLIDATION_RULES.md`** ✅ **KEEP**
- Establishes TIER system
- Verification rules
- Prevents future schema confusion

---

## 🗑️ **COMPLETED MIGRATIONS - MARK AS DONE**

### **Streak Fix Migration** ✅ **COMPLETED**
- `supabase/migrations/20250702000001_fix_player_streaks_trigger.sql`
- **Status**: Successfully applied (Beth's streak shows 8)
- **Action**: Update migration tracking docs

### **Other Completed Migrations**
- Theme columns exist (verified)
- Words clue columns exist (verified)
- Trigger log table exists (verified)

---

## 🎯 **SPECIFIC CLEANUP ACTIONS**

### **Phase 1: Deprecation Headers**
1. Add warning headers to deprecated docs
2. Redirect readers to TIER 1 sources
3. Set removal dates

### **Phase 2: Archive Outdated Files**
1. Move completed migration docs to `docs/archived/`
2. Move outdated schema docs to `docs/archived/`
3. Update README.md with new hierarchy

### **Phase 3: Update Active References**
1. Fix all references to deprecated docs
2. Update SQL queries with correct schema
3. Verify all documentation links work

---

## 🏗️ **NEW DOCUMENTATION STRUCTURE**

```
docs/
├── TIER_1_PRIMARY/
│   ├── CRITICAL_DATABASE_ANALYSIS_JULY_2025.md ✅
│   ├── ACTUAL_DATABASE_SCHEMA.md ✅
│   └── DOCUMENTATION_CONSOLIDATION_RULES.md ✅
├── TIER_2_IMPLEMENTATION/
│   ├── LEADERBOARD_SYSTEM_REDESIGN_PROPOSAL.md
│   ├── mvp.md (updated references)
│   └── implementation-plan.mdc
├── archived/
│   ├── database_schema.md (deprecated)
│   ├── MAY_2025_SCHEMA_ALIGNMENT.md (outdated)
│   └── supa_alignment.md (partially deprecated)
└── README.md (updated hierarchy)
```

---

## ⚡ **IMMEDIATE ACTIONS NEEDED**

1. **Mark `database_schema.md` as deprecated** (contains false user_stats info)
2. **Archive completed migration documentation** 
3. **Update mvp.md references** to point to TIER 1 docs
4. **Fix SQL queries** in troubleshooting docs with correct column names
5. **Create clean documentation hierarchy** following TIER system

This cleanup will prevent future debugging failures caused by outdated schema assumptions. 