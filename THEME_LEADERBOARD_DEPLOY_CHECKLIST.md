# Theme Leaderboard Deployment Checklist

## ✅ COMPLETED

### Backend APIs (Deployed Successfully)
- ✅ `/api/leaderboard/theme-weekly.ts` - Weekly theme leaders
- ✅ `/api/leaderboard/theme-alltime.ts` - All-time theme champions
- ✅ Both compile and deploy without errors

### Frontend Components
- ✅ `WeeklyThemeLeaderboard.tsx` - Component created
- ✅ `AllTimeThemeLeaderboard.tsx` - Component created
- ✅ Menu integration in `SettingsModal.tsx`
- ✅ Wired up in `App.tsx`

### Features Implemented
- ✅ Weekly: Rank | Player | Day | Time | Confidence %
- ✅ All-Time: Rank | Player | Themes | Avg Day | Avg Confidence %
- ✅ Color-coded confidence: Green (≥80%), Orange (≥60%), Gray (<60%)
- ✅ Top 20 + player rank if outside top 20
- ✅ Medal icons for top 3

---

## ⚠️ KNOWN ISSUES

### Issue 1: Network Errors in Preview
**Symptom**: `TypeError: Failed to fetch` and `ERR_INTERNET_DISCONNECTED`

**Root Cause**: Feature branch preview environment has connectivity issues between frontend and backend deployments.

**Evidence from console**:
```
[safeFetch] Request failed to https://undefine-v2-back.vercel.app/api/leaderboard/theme-weekly/
net::ERR_INTERNET_DISCONNECTED
```

**Solution Options**:
1. **Test on main branch** after merge (recommended)
2. **Check Vercel deployment settings** for feature branch
3. **Verify VITE_API_BASE_URL** environment variable in preview

---

### Issue 2: Database Column Clarity
**Symptom**: `similarity_percent` column exists but is not used

**Current State**:
- ✅ `confidence_percentage` (int4) - Used everywhere, correct
- ✅ `similarity_score` (numeric) - Used in backend, correct  
- ⚠️ `similarity_percent` (numeric) - NOT used, can be removed

**Columns We Actually Use**:
```typescript
// In theme_attempts table:
confidence_percentage: INTEGER  // 0-100, shown to users
similarity_score: FLOAT         // 0-1.0, AI raw score
matching_method: TEXT           // 'exact', 'semantic', etc.
```

**Optional Cleanup**:
```sql
-- Remove unused column (optional, not critical)
ALTER TABLE theme_attempts DROP COLUMN IF EXISTS similarity_percent;
```

---

## 📋 TODO BEFORE PRODUCTION

### 1. Test on Main Branch
- [ ] Merge feature branch to main
- [ ] Test both leaderboards load correctly
- [ ] Verify confidence percentages display
- [ ] Check empty states work

### 2. Verify Data
- [ ] Confidence percentages are populated for new guesses
- [ ] Existing guesses have confidence data
- [ ] Color coding works (green/orange/gray)

### 3. Performance
- [ ] APIs respond < 2 seconds
- [ ] Leaderboards load smoothly
- [ ] No console errors

### 4. Edge Cases
- [ ] Empty leaderboard states display correctly
- [ ] Player with no theme guesses handles gracefully
- [ ] Ties in ranking work correctly

---

## 🔧 DEBUGGING TIPS

### If APIs return 404:
1. Check backend deployed successfully
2. Verify API route files exist in `pages/api/leaderboard/`
3. Check Vercel function logs

### If "Network error" persists:
1. Check CORS configuration in `withCors`
2. Verify `VITE_API_BASE_URL` environment variable
3. Test API endpoints directly (Postman/curl)

### If confidence % shows 0:
1. Check if `confidence_percentage` column has data
2. Verify theme guesses after migration have values
3. Old data may have NULL values (expected)

---

## 🎯 SUCCESS CRITERIA

- ✅ Backend compiles without errors
- ⏳ Frontend can fetch from both APIs
- ⏳ Leaderboards display data correctly
- ⏳ Confidence percentages show with color coding
- ⏳ Player rank tracking works
- ⏳ Empty states display properly

**Current Status**: Backend deployed ✅, Frontend has network issues in preview ⚠️

**Recommendation**: **Merge to main and test in production environment** - feature branch previews often have networking limitations.

