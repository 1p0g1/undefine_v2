# Un·Define v2 - The Daily Word Discovery Game

## 🎯 **Current Production Status (January 2025)**

**✅ LIVE & WORKING:**
- **Frontend**: https://undefine-v2-front.vercel.app
- **Backend**: https://undefine-v2-back.vercel.app  
- **Architecture**: Dual deployment with separate frontend and backend
- **Database**: Supabase (fully migrated and operational)
- **APIs**: Cross-domain calls to dedicated backend service

---

## 🏗️ **Architecture Overview**

### **Dual Deployment Model**
```
Frontend (Vite + React) → CORS → Backend (Next.js APIs) → Supabase Database
```

**Benefits:**
- **Separation of concerns** - Frontend and backend scale independently
- **Security isolation** - Backend secrets separated from frontend
- **Independent deployments** - Frontend and backend can be updated separately
- **Scalability** - Each service optimized for its specific role

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

### **✅ Production Deployments:**
- **Frontend**: `undefine-v2-front.vercel.app` (Vite + React)
- **Backend**: `undefine-v2-back.vercel.app` (Next.js APIs)
- **Database**: Supabase with all migrations applied
- **CORS**: Properly configured for cross-domain requests

### **🔧 Environment Configuration:**

#### **Frontend (`undefine-v2-front`):**
```env
# API Routing
VITE_API_BASE_URL=https://undefine-v2-back.vercel.app

# Supabase Client
VITE_SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
VITE_SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Server variables (for any local API routes)
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
SUPABASE_ANON_KEY=[Supabase Anonymous Key]
DB_PROVIDER=supabase
```

#### **Backend (`undefine-v2-back`):**
```env
# Supabase Server
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Configuration
DB_PROVIDER=supabase
JWT_SECRET=[JWT Secret]
NODE_ENV=production
HF_API_KEY=[Hugging Face API Key]
```
