# Archive Play - Production Readiness Plan

**Date:** November 30, 2025  
**Status:** 🔧 Needs Refinement  
**Priority:** 🔥 Critical - Feature partially working but not reliable

---

## 🚨 CURRENT ISSUES

### **1. Guess Submission Failing**
**Error:** `Uncaught (in promise) ApiError: Failed to fetch`
**Impact:** Archive games load but players can't submit guesses
**Root Cause:** Likely network/CORS or backend validation issue

### **2. Play History Not Displaying**
**Observed:** History loads (23 records) but won/lost states don't show in calendar
**Impact:** Players can't see their previous performance
**Root Cause:** Unknown - needs investigation with debug logs

---

## 🎯 PRODUCTION-READY REQUIREMENTS

### **Critical Path (Must Have):**
1. ✅ Archive games must load reliably
2. ❌ **Guess submissions must work** (BLOCKING)
3. ❌ **Play history must display correctly** (BLOCKING)
4. ✅ Archive plays must not affect live stats
5. ⚠️  Error handling and fallbacks

### **Nice to Have:**
- Archive-specific leaderboards
- Archive achievements
- Better visual design
- Performance optimizations

---

## 🔍 DIAGNOSTIC STEPS

### **Step 1: Identify Guess Submission Failure**

**Debug Questions:**
1. Is the request reaching the backend?
2. Is it a CORS issue (frontend → backend)?
3. Is validation failing on the backend?
4. Is the game session properly created?

**Actions:**
```javascript
// Add to client/src/api/client.ts submitGuess method
console.log('[submitGuess] Request details:', {
  url,
  method: 'POST',
  body: request,
  headers: {
    'player-id': request.playerId
  }
});
```

**Check Backend Logs:**
- Look for `/api/guess` requests
- Check if archive game sessions are being created properly
- Verify `is_archive_play` flag is set

---

### **Step 2: Fix Play History Display**

**Current State:**
- API returns 23 history records ✅
- Console shows: `[StreakCalendarModal] Loaded 23 history records`
- But calendar shows no won/lost indicators ❌

**Hypothesis:**
Date format mismatch between:
- History API: `"2025-11-30"` 
- Calendar: `"2025-11-30"`
- getDateString() result: `???`

**Actions:**
```typescript
// Check date formats in console
console.log('[loadPlayHistory] Sample dates:', 
  data.history.slice(0, 3).map(h => ({ date: h.date, played: h.played, won: h.won }))
);

// Check calendar date generation
console.log('[getDateString] Generated:', getDateString(2025, 10, 30));

// Check getDayData matching
console.log('[getDayData] Looking for:', dateString, 'in history:', history.map(h => h.date));
```

---

## 🏗️ SUSTAINABLE ARCHITECTURE

### **Option A: Current Approach (Needs Fixes)**

**Pros:**
- Database already configured
- Triggers in place
- View created for stats

**Cons:**
- Play history not displaying
- Guess submission failing
- Complex state management

**What Needs Fixing:**
1. Debug and fix guess submission
2. Fix play history display
3. Add comprehensive error handling
4. Add loading states
5. Add retry logic

---

### **Option B: Simplified Approach (Recommended)**

**Core Principle:** Make archive play work EXACTLY like live play, just with a flag.

**Changes:**

#### **1. Unified Game Flow**
```typescript
// Same code path for both
async function startGame(date?: string) {
  const isArchive = date && date !== getTodayDateString();
  
  // Single API call
  const word = await apiClient.getWord(date);
  
  // Single game initialization
  const state = createGameState(word, isArchive);
  
  // All game logic identical from here
}
```

#### **2. Single Submit Guess Endpoint**
```typescript
// Backend handles both
POST /api/guess
{
  gameId,
  wordId,
  guess,
  // Backend determines if archive from game_sessions.is_archive_play
}
```

#### **3. Calendar Display Fix**
```typescript
// Simpler state logic
function getDateState(date: string): DateState {
  // 1. Check if it's today
  if (date === today) return 'today';
  
  // 2. Check play history FIRST
  const historyEntry = playHistory.find(h => h.date === date);
  if (historyEntry) {
    return historyEntry.won ? 'won' : 'lost';
  }
  
  // 3. Check if word exists
  const wordExists = availableDates.has(date);
  if (wordExists) return 'available';
  
  // 4. No word
  return 'no-word';
}
```

---

## 🔧 IMMEDIATE FIXES

### **Fix 1: Guess Submission**

**Root Cause Investigation:**
1. Check if game session was created with all required fields
2. Verify backend `/api/guess` receives the request
3. Check CORS headers
4. Verify validation passes

**Potential Fix:**
```typescript
// client/src/services/GameService.ts
// Ensure archive games have all required fields
public async startArchiveGame(date: string): Promise<GameSessionState> {
  const data = await apiClient.getArchiveWord(date);
  
  // CRITICAL: Verify all fields are present
  if (!data.gameId || !data.word?.id || !data.start_time) {
    throw new Error('Archive word response missing required fields');
  }
  
  // Create state with complete data
  this.currentState = {
    gameId: data.gameId,      // Must be set
    wordId: data.word.id,     // Must be set
    wordText: data.word.word, // Must be set
    startTime: data.start_time, // Must be set
    // ... all other fields
  };
  
  return this.currentState;
}
```

---

### **Fix 2: Play History Display**

**Immediate Debug:**
```typescript
// Add to StreakCalendarModal.tsx
const getDayData = (dateString: string): DayHistory | null => {
  const found = history.find(h => h.date === dateString);
  
  // Debug logging
  if (dateString === '2025-11-30') {
    console.log('[getDayData] Looking for 2025-11-30');
    console.log('[getDayData] History dates:', history.map(h => h.date));
    console.log('[getDayData] Found:', found);
  }
  
  return found || null;
};
```

**Likely Fix:**
```typescript
// Date comparison issue - need to normalize
const normalizeDate = (date: string): string => {
  // Ensure YYYY-MM-DD format
  return new Date(date).toISOString().split('T')[0];
};

const getDayData = (dateString: string): DayHistory | null => {
  const normalizedSearch = normalizeDate(dateString);
  return history.find(h => normalizeDate(h.date) === normalizedSearch) || null;
};
```

---

## 📊 TESTING PROTOCOL

### **Test 1: Archive Game Load**
- [x] Click available date
- [x] Archive banner shows
- [x] Word displays correctly
- [x] Game date shows in banner

### **Test 2: Archive Game Play**
- [ ] Submit guess → processes correctly
- [ ] Reveal clues → works normally
- [ ] Win game → completes properly
- [ ] Lose game → completes properly

### **Test 3: Stats Separation**
- [ ] Archive win → streak unchanged
- [ ] Archive win → not on leaderboard
- [ ] Check database: `is_archive_play = true`
- [ ] Check database: not in `leaderboard_summary`

### **Test 4: Play History**
- [ ] Calendar shows won (✅) dates
- [ ] Calendar shows lost (❌) dates
- [ ] Calendar shows available (blue) dates
- [ ] Won dates not clickable
- [ ] Lost dates clickable (retry)

---

## 🎯 ROLLOUT PLAN

### **Phase 1: Critical Fixes (Today)**
1. Fix guess submission
2. Fix play history display
3. Basic error handling
4. Deploy and test

### **Phase 2: Polish (Tomorrow)**
1. Loading states
2. Error messages
3. Retry logic
4. Better UX

### **Phase 3: Enhancement (Next Week)**
1. Archive leaderboards
2. Archive achievements
3. Performance optimization
4. Analytics

---

## 🔒 ROLLBACK PLAN

If archive play causes issues:

### **Quick Disable:**
```typescript
// client/src/components/StreakBadge.tsx
<StreakCalendarModal
  open={showCalendar}
  onClose={() => setShowCalendar(false)}
  playerId={playerId}
  onSelectArchiveDate={undefined} // Disable archive play
/>
```

### **Full Rollback:**
```sql
-- Archive plays remain in database but feature disabled
-- No data loss
-- Can re-enable anytime
```

---

## 📈 SUCCESS METRICS

### **Technical:**
- [ ] 100% of archive games load successfully
- [ ] 100% of guesses submit successfully
- [ ] 100% of play history displays correctly
- [ ] 0 stat corruption incidents

### **User Experience:**
- [ ] Archive play feels identical to live play
- [ ] Clear visual distinction (archive banner)
- [ ] No confusion about stat impact
- [ ] Smooth transitions

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. **Add detailed logging to guess submission**
   - Log request before sending
   - Log response/error
   - Identify exact failure point

2. **Add date format logging to calendar**
   - Log history dates
   - Log calendar dates
   - Log comparison results

3. **Test in console**
   - Manually test date matching
   - Verify data structures

4. **Deploy with logging**
   - Monitor production logs
   - Identify patterns
   - Fix issues

---

**Last Updated:** November 30, 2025  
**Status:** 🔧 In Progress - Critical fixes needed  
**Owner:** Paddy + AI Assistant  
**ETA:** 1-2 hours for critical fixes

