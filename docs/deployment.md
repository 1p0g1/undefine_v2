# Un-Define v2 Production Deployment Guide

## 🏗️ **CURRENT ARCHITECTURE (Updated January 2025)**

**Single Deployment Model**: Frontend with co-located APIs
- **Frontend + APIs**: `undefine-v2-front.vercel.app` 
- **Database**: Supabase
- **No separate backend deployment needed**

---

## ✅ **Completed Tasks**

### Database Migrations
- [x] Applied all database migrations successfully
- [x] Fixed leaderboard_summary table structure
- [x] Updated score calculations and data
- [x] Added players table
- [x] Added game session columns
- [x] Added score fields
- [x] Fixed word relationships
- [x] Removed deprecated word column

### Type Generation
- [x] Generated Supabase client types
- [x] Updated TypeScript types in the codebase

### Backend Logic
- [x] Fixed submitGuess required fields
- [x] Removed fallback word logic
- [x] Updated game session creation
- [x] Fixed leaderboard ranking

---

## 🔄 **Environment Setup**

### 🎯 **Frontend Deployment (undefine-v2-front.vercel.app)**

**Required Environment Variables:**
```env
# Supabase Client (Frontend)
VITE_SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
VITE_SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Supabase Server (API Routes)  
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Database Configuration
DB_PROVIDER=supabase

# Theme Matching (Optional)
HF_API_KEY=[Hugging Face API Key for semantic similarity]
```

**⚠️ IMPORTANT: DO NOT SET THESE:**
```env
# ❌ DO NOT SET - Causes API routing issues
# VITE_API_BASE_URL=https://undefine-v2-back.vercel.app

# ❌ DEPRECATED - No longer needed
# JWT_SECRET=[Not needed for single deployment]
# NODE_ENV=[Handled automatically by Vercel]
```

---

## 🚀 **Deployment Process**

### **Single Deployment Build:**
```bash
# Build frontend with APIs
cd client/
npm run build

# Deploy to Vercel (frontend project)
vercel --prod
```

### **API Endpoints Location:**
All APIs are co-located with frontend:
```
/pages/api/word.ts              # Daily word
/pages/api/guess.ts             # Game submissions  
/pages/api/streak-status.ts     # Player streaks
/pages/api/theme-status.ts      # Theme of the week
/pages/api/leaderboard.ts       # Daily leaderboard
/pages/api/leaderboard/all-time.ts  # All-time stats
/pages/api/player/history.ts    # Calendar data
```

---

## 🧪 **Testing Checklist**

### **After Deployment, Verify:**
1. **🔥 Streak Counter**: Shows actual values (not 0)
2. **📅 Calendar Modal**: Loads play history when clicked
3. **📊 All-Time Leaderboards**: Both ranking & streak tabs work
4. **📋 Daily Leaderboard**: Accessible via burger menu
5. **🎨 Theme Features**: Theme guessing and 'Un' diamond colors
6. **🎮 Core Game**: Word loading, guessing, scoring

### **Console Verification:**
**✅ GOOD - Should see:**
```
[getApiBaseUrl] Using same-domain APIs for production
[API xxx] Request: /api/streak-status
[API xxx] Request: /api/theme-status
```

**❌ BAD - Should NOT see:**
```
https://undefine-v2-back.vercel.app/api/*
net::ERR_INTERNET_DISCONNECTED
SyntaxError: Unexpected token '<'
```

---

## 🏆 **Architecture Benefits**

### **Previous (Complex):**
- Frontend deployment + Separate backend deployment
- CORS configuration + Environment variables sync
- Multiple points of failure + API routing confusion

### **Current (Simple):**
- **Single Next.js deployment** with co-located APIs
- **Same-domain requests** (faster, more reliable)  
- **Automatic scaling** and **simplified maintenance**

---

## 🛠️ **Troubleshooting**

### **Issue: APIs not working**
**Check**: `VITE_API_BASE_URL` is not set (should be empty/missing)

### **Issue: Supabase connection failed**  
**Check**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

### **Issue: Database operations fail**
**Check**: `SUPABASE_SERVICE_ROLE_KEY` is set for API routes

---

## 📈 **Monitoring**

- **Vercel Dashboard**: Monitor deployment status and logs
- **Supabase Dashboard**: Monitor database performance  
- **Browser Console**: Check for API routing issues
- **Network Tab**: Verify same-domain API calls 