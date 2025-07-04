# Archived Documentation - July 2, 2025

This folder contains documentation that has been **deprecated** or **superseded** by more accurate information.

## ⚠️ **DO NOT USE THESE DOCUMENTS**

These files contain **outdated or incorrect information** that can cause debugging failures and implementation errors.

---

## 📋 **ARCHIVED FILES**

### **`database_schema_DEPRECATED_JULY_2025.md`**
- **Deprecated**: July 2, 2025
- **Issue**: Contains false assumptions about `user_stats` table being populated
- **Impact**: SQL queries fail with "column does not exist" errors
- **Replacement**: `docs/CRITICAL_DATABASE_ANALYSIS_JULY_2025.md`

### **`MAY_2025_SCHEMA_ALIGNMENT_DEPRECATED_JULY_2025.md`**
- **Deprecated**: July 2, 2025  
- **Issue**: Based on incorrect schema assumptions
- **Impact**: Claims issues were "resolved" when they weren't
- **Replacement**: `docs/ACTUAL_DATABASE_SCHEMA.md`

---

## ✅ **USE THESE DOCUMENTS INSTEAD**

### **TIER 1 - PRIMARY SOURCES OF TRUTH**
- `docs/CRITICAL_DATABASE_ANALYSIS_JULY_2025.md` - Screenshot-verified facts
- `docs/ACTUAL_DATABASE_SCHEMA.md` - Correct table structures
- `docs/DOCUMENTATION_CONSOLIDATION_RULES.md` - Verification system

### **TIER 2 - IMPLEMENTATION GUIDES**  
- `docs/LEADERBOARD_SYSTEM_REDESIGN_PROPOSAL.md` - Current implementation plan
- `docs/implementation-plan.mdc` - Live progress tracking

---

## 🚨 **WHY THESE WERE DEPRECATED**

The archived documents caused multiple debugging failures because they:

1. **Referenced empty tables as data sources** (`user_stats` is all zeros)
2. **Used wrong column names** (`longest_streak` vs `highest_streak`)
3. **Made false assumptions** about database population
4. **Contained outdated foreign key relationships**

## 📅 **REMOVAL SCHEDULE**

These files will be **permanently deleted** on:
- **August 2, 2025** (30 days after deprecation)

If you need information from these files, migrate to the TIER 1 documents above. 