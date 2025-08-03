# Un-Define v2 Production Deployment Guide

## 🏗️ **CURRENT ARCHITECTURE (Updated January 2025)**

**Dual Deployment Model**: Frontend + Separate Backend
- **Frontend**: `undefine-v2-front.vercel.app` (Vite + React)
- **Backend**: `undefine-v2-back.vercel.app` (Next.js APIs)
- **Database**: Supabase
- **API Routing**: Frontend calls separate backend for all API operations

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
# API Routing (Points to separate backend)
VITE_API_BASE_URL=https://undefine-v2-back.vercel.app

# Supabase Client (Frontend)
VITE_SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
VITE_SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Supabase Server (For any local API routes)
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Database Configuration
DB_PROVIDER=supabase
```

### 🎯 **Backend Deployment (undefine-v2-back.vercel.app)**

**Required Environment Variables:**
```env
# Supabase Server (API Routes)
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
SUPABASE_ANON_KEY=[Supabase Anonymous Key]

# Database Configuration
DB_PROVIDER=supabase

# Security
JWT_SECRET=[JWT Secret for API authentication]
NODE_ENV=production

# Theme Matching (Optional)
HF_API_KEY=[Hugging Face API Key for semantic similarity]
```

---

## 🚀 **Deployment Process**

### **Dual Deployment Build:**
```bash
# Build frontend
cd client/
npm run build
vercel --prod

# Build backend
cd ../
npm run build
vercel --prod
```

### **API Endpoints Location:**
Backend APIs are hosted separately:
```
https://undefine-v2-back.vercel.app/api/word              # Daily word
https://undefine-v2-back.vercel.app/api/guess            # Game submissions  
https://undefine-v2-back.vercel.app/api/streak-status    # Player streaks
https://undefine-v2-back.vercel.app/api/theme-status     # Theme of the week
https://undefine-v2-back.vercel.app/api/leaderboard      # Daily leaderboard
https://undefine-v2-back.vercel.app/api/leaderboard/all-time # All-time stats
https://undefine-v2-back.vercel.app/api/player/history   # Calendar data
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
[API Client] Initialized with: baseUrl: "https://undefine-v2-back.vercel.app"
[API xxx] Request: https://undefine-v2-back.vercel.app/api/streak-status
[API xxx] Request: https://undefine-v2-back.vercel.app/api/theme-status
```

**❌ BAD - Should NOT see:**
```
net::ERR_INTERNET_DISCONNECTED
SyntaxError: Unexpected token '<'
Failed to fetch
```

---

## 🏆 **Architecture Benefits**

### **Dual Deployment Model:**
- **Separation of concerns** - Frontend and backend deployed independently
- **Scalability** - Each service can scale independently
- **CORS configured** - Proper cross-origin request handling
- **Security** - Backend secrets isolated from frontend

### **Trade-offs:**
- **More complex deployment** - Two projects to maintain
- **CORS setup required** - Additional configuration overhead
- **Network latency** - Cross-domain API calls

---

## 🛠️ **Troubleshooting**

### **Issue: APIs not working**
**Check**: `VITE_API_BASE_URL` points to correct backend URL

### **Issue: CORS errors**
**Check**: Backend has proper CORS configuration and `withCors` wrapper

### **Issue: Supabase connection failed**  
**Check**: Both frontend and backend have correct Supabase credentials

### **Issue: Authentication errors**
**Check**: Backend has `JWT_SECRET` and proper environment variables

---

## 📈 **Monitoring**

- **Frontend Vercel Dashboard**: Monitor frontend deployment and logs
- **Backend Vercel Dashboard**: Monitor API performance and errors
- **Supabase Dashboard**: Monitor database performance  
- **Browser Console**: Check for API routing and CORS issues
- **Network Tab**: Verify cross-domain API calls are successful 