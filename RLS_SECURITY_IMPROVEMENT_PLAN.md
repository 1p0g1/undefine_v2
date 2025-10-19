# 🔒 RLS Security Improvement Plan

## 📊 **Current Security State Analysis**

From your Security Advisor screenshots, the following tables have **RLS DISABLED** which is a security vulnerability:

### **Tables Requiring RLS Implementation:**
- ✅ `public.game_sessions` - **CRITICAL** (Contains player game data)
- ✅ `public.words` - **MEDIUM** (Game content - could be public)
- ✅ `public.trigger_log` - **CRITICAL** (Contains system internals)
- ✅ `public.scores` - **CRITICAL** (Player performance data)
- ✅ `public.daily_leaderboard_snapshots` - **HIGH** (Historical rankings)
- ✅ `public.leaderboard_summary` - **HIGH** (Current rankings)
- ✅ `public.player_streaks` - **CRITICAL** (Personal player data)
- ✅ `public.players` - **CRITICAL** (Player personal information)

---

## 🎯 **RLS Implementation Strategy**

### **Phase 1: Player Data Protection**
**Goal**: Ensure players can only see their own data

#### **Priority Tables:**
1. **`players`** - Players see only their own record
2. **`game_sessions`** - Players see only their own games
3. **`player_streaks`** - Players see only their own streaks
4. **`scores`** - Players see only their own scores

#### **Sample RLS Policies:**
```sql
-- Players can only see their own data
CREATE POLICY "players_own_data" ON players FOR ALL TO authenticated 
USING (id = auth.uid());

-- Players can only see their own game sessions
CREATE POLICY "game_sessions_own_data" ON game_sessions FOR ALL TO authenticated 
USING (player_id = auth.uid());

-- Players can only see their own streaks
CREATE POLICY "player_streaks_own_data" ON player_streaks FOR ALL TO authenticated 
USING (player_id = auth.uid());

-- Players can only see their own scores
CREATE POLICY "scores_own_data" ON scores FOR ALL TO authenticated 
USING (player_id = auth.uid());
```

### **Phase 2: Leaderboard Data**
**Goal**: Public leaderboard visibility while protecting personal details

#### **Strategy:**
- **`leaderboard_summary`** - Public read, player write own data
- **`daily_leaderboard_snapshots`** - Public read for leaderboards

```sql
-- Leaderboard data is publicly readable, players write own data
CREATE POLICY "leaderboard_summary_read" ON leaderboard_summary FOR SELECT TO anon 
USING (true);

CREATE POLICY "leaderboard_summary_write" ON leaderboard_summary FOR INSERT/UPDATE TO authenticated 
USING (player_id = auth.uid());

-- Historical snapshots are publicly readable
CREATE POLICY "snapshots_read" ON daily_leaderboard_snapshots FOR SELECT TO anon 
USING (true);
```

### **Phase 3: System Tables**
**Goal**: Admin-only access to system internals

#### **Strategy:**
- **`trigger_log`** - Admin only
- **`schema_migrations`** - Admin only

```sql
-- System tables - admin only
CREATE POLICY "trigger_log_admin_only" ON trigger_log FOR ALL TO service_role 
USING (true);
```

---

## ⚠️ **Critical Considerations**

### **1. Current API Architecture**
Your APIs use `SUPABASE_SERVICE_ROLE_KEY` which **bypasses RLS**. This is currently necessary for:
- Cross-player leaderboard queries
- Administrative operations
- System triggers

### **2. Breaking Changes Risk**
Enabling RLS could break:
- ❌ Leaderboard generation (needs cross-player data)
- ❌ Admin APIs (needs system-wide access)
- ❌ Trigger functions (need system access)

### **3. Authentication Requirements**
Current system uses anonymous players (UUID-based). RLS typically requires:
- 🔄 **Supabase Auth** integration
- 🔄 **Session management**
- 🔄 **Player-to-auth mapping**

---

## 🚀 **Safe Implementation Approach**

### **Step 1: Audit Current Access Patterns**
```sql
-- Check which APIs access which tables
-- Document all cross-player queries
-- Identify service_role vs anon access needs
```

### **Step 2: Create Service Role Exceptions**
```sql
-- Keep service_role bypass for system operations
-- Create limited anon policies for public data
-- Implement gradual restrictions
```

### **Step 3: Phased Rollout**
1. **Test environment first** - Enable RLS on staging
2. **One table at a time** - Start with `trigger_log` (least risk)
3. **Monitor API failures** - Watch for broken queries
4. **Rollback capability** - Quick disable if needed

### **Step 4: Player Data Protection**
1. **Map UUIDs to auth.uid()** - If using Supabase Auth
2. **OR create custom JWT system** - For current UUID approach
3. **Implement row-level filtering** - Player sees only own data

---

## 📝 **Action Items for Later**

### **Immediate (Low Risk):**
- [ ] Enable RLS on `trigger_log` (internal only)
- [ ] Enable RLS on `schema_migrations` (admin only)

### **Medium Term (Requires Testing):**
- [ ] Enable RLS on `words` table (can be public read)
- [ ] Enable RLS on `daily_leaderboard_snapshots` (public read)

### **Long Term (Major Changes):**
- [ ] Implement authentication mapping for player data
- [ ] Enable RLS on `players`, `game_sessions`, `scores`, `player_streaks`
- [ ] Refactor APIs to work with RLS constraints

---

## 🔍 **Testing Checklist**

Before enabling RLS on any table:
- [ ] Test all existing API endpoints
- [ ] Verify leaderboard functionality
- [ ] Check play history modal
- [ ] Ensure game completion triggers work
- [ ] Test admin/debug endpoints
- [ ] Verify theme system functionality

---

*This document serves as a roadmap for gradually improving security without breaking existing functionality.*
