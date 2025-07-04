# Un-Define Documentation

**Last Updated**: July 2, 2025  
**Documentation System**: TIER-based verification hierarchy

## ⚡ **QUICK START - USE THESE DOCUMENTS**

### **🥇 TIER 1: PRIMARY SOURCES OF TRUTH**
*Screenshot-verified, actively maintained*

- **`CRITICAL_DATABASE_ANALYSIS_JULY_2025.md`** ⭐ - Actual database usage analysis
- **`ACTUAL_DATABASE_SCHEMA.md`** 🗄️ - Verified table structures  
- **`DOCUMENTATION_CONSOLIDATION_RULES.md`** 📋 - Verification system rules

### **🥈 TIER 2: IMPLEMENTATION GUIDES**
*Planning and development references*

- **`implementation-plan.mdc`** 📝 - Live execution log and progress tracking
- **`LEADERBOARD_SYSTEM_REDESIGN_PROPOSAL.md`** 🏗️ - Current implementation plan
- **`mvp.md`** 🎯 - Project goals and business requirements

---

## 🚨 **DEPRECATED DOCUMENTATION**

### **⚠️ DO NOT USE - ARCHIVED**
These documents contain **incorrect information** that causes debugging failures:

- ~~`database_schema.md`~~ → **MOVED TO** `archived/` (false user_stats assumptions)
- ~~`MAY_2025_SCHEMA_ALIGNMENT.md`~~ → **MOVED TO** `archived/` (outdated schema)
- ~~`supa_alignment.md`~~ → **PARTIALLY DEPRECATED** (wrong column names)

**See `archived/README.md` for full details**

---

## 📊 **DOCUMENTATION SYSTEM OVERVIEW**

### **TIER 1 Rules**
✅ **Screenshot-verified facts only**  
✅ **SQL tested on actual database**  
✅ **Updated when database changes**  
❌ **No assumptions or speculation**

### **TIER 2 Rules**  
✅ **References TIER 1 for current state**  
✅ **Planning and implementation guides**  
✅ **Updated when features change**  
❌ **No database schema assumptions**

### **TIER 3 Rules**
❌ **DEPRECATED - DO NOT USE**  
❌ **Contains outdated information**  
❌ **Causes debugging failures**  
✅ **Archived with clear warnings**

---

## 🎯 **MAJOR ACHIEVEMENTS - JULY 2025**

### **✅ COMPLETED FEATURES**
1. **Theme Feature**: Working perfectly (user confirmed)
2. **Streak System**: Fixed (Beth shows correct 8-win streak)  
3. **Database Cleanup**: Removed user_stats redundancy
4. **Modal Bug**: Fixed premature "Better luck tomorrow"
5. **Documentation**: Established TIER verification system

### **✅ VERIFIED DATABASE FACTS**
- `user_stats` table is **abandoned** (all zeros/nulls)
- `player_streaks` has **correct streak data**
- `game_sessions` → `leaderboard_summary` is **primary data flow**
- Theme columns **exist and working**
- Beth's streak migration **successfully applied**

---

## 📋 **DOCUMENTATION UPDATE PROCESS**

### **When Database Changes Are Made:**

1. **Update TIER 1 documents FIRST**
   - Verify changes work in production
   - Take screenshots if significant changes
   - Test SQL scripts with new schema

2. **Update TIER 2 implementation docs**
   - Reference TIER 1 for current state
   - Update planning documents
   - Log changes in implementation-plan.mdc

3. **Archive outdated documents**
   - Move to `archived/` folder
   - Add deprecation warnings
   - Update references in active docs

### **Before Using ANY Documentation:**

1. ✅ **Check if it's TIER 1** (screenshot-verified)
2. ✅ **Verify SQL queries work** on actual database
3. ✅ **Test on small dataset first** before full implementation
4. ❌ **Never assume columns exist** without verification

---

## 🔍 **INVESTIGATION RULES**

### **SQL Script Development:**
1. **Check schema first**: Verify tables and columns exist
2. **Use actual player IDs**: From verified sources only
3. **Test incrementally**: Single records before full datasets
4. **Include error handling**: For missing tables/columns

### **API Development:**
1. **Don't use user_stats**: It's not populated
2. **Calculate from game_sessions**: Primary data source
3. **Verify foreign keys**: Before implementing relationships
4. **Test with production data**: Before deployment

---

## 📞 **GETTING HELP**

### **For Database Issues:**
1. Check `CRITICAL_DATABASE_ANALYSIS_JULY_2025.md` first
2. Verify schema in `ACTUAL_DATABASE_SCHEMA.md`
3. Follow verification rules in `DOCUMENTATION_CONSOLIDATION_RULES.md`

### **For Implementation:**
1. Check progress in `implementation-plan.mdc`
2. Reference current plan in `LEADERBOARD_SYSTEM_REDESIGN_PROPOSAL.md`
3. Verify business requirements in `mvp.md`

---

## 🏆 **SUCCESS METRICS**

- ✅ **Zero SQL "column does not exist" errors** (achieved July 2025)
- ✅ **All features working in production** (achieved July 2025)  
- ✅ **Documentation matches reality** (established TIER system)
- ✅ **Debugging failures eliminated** (deprecated false assumptions) 