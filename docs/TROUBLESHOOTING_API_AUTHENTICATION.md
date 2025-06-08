# API Authentication & Routing Troubleshooting Guide

## 🚨 **Critical Architecture Understanding**

This project uses **TWO SEPARATE Vercel deployments**:

1. **Frontend (Vite)**: `undefine-v2-front-[hash]-paddys-projects-82cb6057.vercel.app`
2. **Backend (Next.js API)**: `undefine-v2-back.vercel.app`

**⚠️ API routes ONLY exist on the backend deployment!**

## 🔍 **Common Issue: "Authentication Required" Errors**

### **Symptoms**
```
SyntaxError: Unexpected token '<', "<!doctype h"... is not valid JSON
```
- Browser shows HTML authentication page instead of JSON
- Network tab shows 200 response but HTML content
- Console errors about invalid JSON parsing

### **Root Causes & Solutions**

#### **1. Missing `withCors` Wrapper**
**Problem**: API endpoints without `withCors` wrapper get blocked by Vercel's authentication system.

**Solution**: Always wrap API handlers with `withCors`:
```typescript
// ❌ WRONG - Direct export
export default async function handler(req, res) {
  // API logic
}

// ✅ CORRECT - Wrapped with CORS
import { withCors } from '../../../lib/withCors';

async function handler(req, res) {
  // API logic
}

export default withCors(handler);
```

#### **2. Wrong API Base URL**
**Problem**: Frontend calling API endpoints on frontend domain instead of backend domain.

**Examples of WRONG API calls:**
```typescript
// ❌ Calling API on frontend domain
fetch('/api/leaderboard/all-time')  // Will fail!
fetch('/api/word')                  // Will fail!
```

**Solution**: Always use proper BASE_URL configuration:
```typescript
// ✅ CORRECT - Use backend domain
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://undefine-v2-back.vercel.app';
fetch(`${BASE_URL}/api/leaderboard/all-time`)
```

## 🛠️ **Debugging Process**

### **Step 1: Identify the Domain**
```bash
# Check which domain the error occurs on
# Frontend domain: undefine-v2-front-[hash]...
# Backend domain: undefine-v2-back.vercel.app
```

### **Step 2: Test API Endpoints Directly**
```bash
# Test backend API directly
curl -X GET "https://undefine-v2-back.vercel.app/api/leaderboard/all-time"

# If you get HTML instead of JSON, check for missing withCors wrapper
```

### **Step 3: Check Frontend API Configuration**
```typescript
// Verify BASE_URL is pointing to backend
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

## 📋 **API Endpoint Checklist**

Before deploying any new API endpoint, verify:

- [ ] **Has `withCors` wrapper**
  ```typescript
  import { withCors } from '../../../lib/withCors';
  export default withCors(handler);
  ```

- [ ] **Proper error handling**
  ```typescript
  try {
    // API logic
  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
  ```

- [ ] **Consistent response format**
  ```typescript
  // Success response
  return res.status(200).json({
    success: true,
    data: result
  });

  // Error response
  return res.status(400).json({
    success: false,
    error: 'Descriptive error message'
  });
  ```

## 🔧 **Environment Configuration**

### **Backend (.env)**
```bash
SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[secret]
SUPABASE_ANON_KEY=[public]
JWT_SECRET=[secret]
DB_PROVIDER=supabase
```

### **Frontend (.env)**
```bash
VITE_API_BASE_URL=https://undefine-v2-back.vercel.app
VITE_SUPABASE_URL=https://eaclljwvsicezmkjnlbm.supabase.co
VITE_SUPABASE_ANON_KEY=[public]
```

## 🚀 **Prevention Best Practices**

1. **Always use API client pattern for frontend calls**
2. **Never use relative paths for API calls in production**
3. **Test API endpoints directly before frontend integration**
4. **Include `withCors` wrapper in all new API routes**
5. **Use proper error handling and logging**
6. **Document API response formats**

## 📝 **Case Study: All-Time Leaderboard Fix**

### **Issue**: Network error loading all-time stats
### **Root Causes**:
1. Missing `withCors` wrapper in `/api/leaderboard/all-time.ts`
2. Frontend using relative path instead of backend URL

### **Fixes Applied**:
1. **Added CORS wrapper**:
   ```typescript
   // pages/api/leaderboard/all-time.ts
   import { withCors } from '../../../lib/withCors';
   export default withCors(handler);
   ```

2. **Fixed API URL**:
   ```typescript
   // client/src/components/AllTimeLeaderboard.tsx
   const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://undefine-v2-back.vercel.app';
   fetch(`${BASE_URL}/api/leaderboard/all-time`)
   ```

### **Result**: All-time leaderboard now loads successfully ✅

## 🔄 **Testing After Fixes**

1. **Verify API responds with JSON**:
   ```bash
   curl -H "Accept: application/json" https://undefine-v2-back.vercel.app/api/leaderboard/all-time
   ```

2. **Check frontend console for errors**
3. **Test all leaderboard tabs function correctly**
4. **Verify proper error handling for edge cases** 