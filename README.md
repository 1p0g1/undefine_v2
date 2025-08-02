# Un·Define v2 - The Daily Word Discovery Game

## 🎯 **Current Production Status (January 2025)**

**✅ LIVE & WORKING:**
- **Production URL**: https://undefine-v2-front.vercel.app
- **Architecture**: Single deployment with co-located APIs
- **Database**: Supabase (fully migrated and operational)
- **APIs**: Same-domain routing for optimal performance

---

## 🏗️ **Architecture Overview**

### **Single Deployment Model**
```
Frontend (Vite + React) + APIs (Next.js) → Single Vercel Deployment
                    ↓
                Supabase Database
```

**Benefits:**
- **Simplified deployment** - One deployment instead of two
- **Faster API calls** - Same-domain requests (no CORS issues)
- **Easier maintenance** - Co-located frontend and backend code
- **Better performance** - Reduced network latency

---

## 🎮 **Game Features**

### **Core Gameplay**
- Daily word challenges with definition clues
- 6-guess limit with progressive clue reveals
- Real-time scoring and leaderboards
- Streak tracking for consecutive daily wins

### **Theme of the Week**
- Weekly theme guessing with semantic similarity
- Dynamic 'Un' diamond that changes color based on accuracy
- Progressive difficulty and bonus scoring

### **Social Features**
- Daily leaderboards with rankings
- All-time statistics and achievements
- Player profiles with win streaks
- Play history calendar view

---

## 🚀 **Deployment Status**

### **✅ Production Deployment:**
- **Frontend + APIs**: `undefine-v2-front.vercel.app` 
- **Environment**: All variables properly configured
- **Database**: Supabase with all migrations applied
- **Performance**: Optimized with same-domain API calls

### **🔧 Environment Configuration:**
```env
# Frontend (Client-side)
VITE_SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
VITE_SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# API Routes (Server-side)
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
SUPABASE_ANON_KEY=[Supabase Anonymous Key]
DB_PROVIDER=supabase

# ⚠️ DO NOT SET (causes API routing issues):
# VITE_API_BASE_URL=[removed for optimal performance]
```
