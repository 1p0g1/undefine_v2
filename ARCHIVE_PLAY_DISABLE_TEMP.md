# Temporary Archive Play Disable

**Date:** November 30, 2025  
**Reason:** Guess submissions failing with ERR_INTERNET_DISCONNECTED  
**Status:** Recommend temporary disable while we fix properly

---

## The Issue

Archive games load correctly but guess submissions fail with:
```
POST https://undefine-v2-back.vercel.app/api/guess net::ERR_INTERNET_DISCONNECTED
```

This error typically indicates:
1. **CORS rejection** by the backend
2. **Backend timeout** or error before sending response
3. **Backend validation failure** that crashes the endpoint

---

## Temporary Disable (Recommended)

To restore full functionality while we debug:

### Quick Fix:
```typescript
// client/src/components/StreakBadge.tsx
<StreakCalendarModal
  open={showCalendar}
  onClose={() => setShowCalendar(false)}
  playerId={playerId}
  // onSelectArchiveDate={onSelectArchiveDate} // DISABLED
/>
```

This will:
- ✅ Keep calendar history view working
- ✅ Keep all live gameplay working
- ❌ Disable archive play temporarily
- No data loss - can re-enable anytime

---

## Root Cause Analysis

### What We Know:
1. Archive game LOADS successfully ✅
2. Game session is CREATED in database ✅
3. Request is SENT to `/api/guess` ✅
4. Request FAILS at network level ❌

### Likely Causes:

#### 1. Backend Crash (Most Likely)
The `/api/guess` endpoint might be crashing when it encounters an archive game session.

**Check:**
- Does backend handle `is_archive_play` flag?
- Does validation pass for archive games?
- Are there any required fields missing?

#### 2. CORS Issue
The backend might be rejecting archive game requests.

**Check:**
- Are CORS headers set correctly?
- Does `/api/guess` endpoint have CORS middleware?

#### 3. Database Issue
Game session might not be properly saved.

**Check:**
- Is `game_sessions` record actually in database?
- Does it have all required fields?
- Is `is_archive_play` and `game_date` set?

---

## Proper Fix (Requires Investigation)

### Step 1: Check Backend Logs
Look at Vercel backend logs for `/api/guess` errors:
- Is the request reaching the backend?
- Is there a crash or error?
- What's the actual error message?

### Step 2: Test Archive Game Session
Query database to see if archive session was created:
```sql
SELECT * FROM game_sessions 
WHERE id = 'd526ca21-dc15-4879-a59d-f939f1f1d96a';
```

Check for:
- All required fields present?
- `is_archive_play = true`?
- `game_date` set correctly?

### Step 3: Test Guess Endpoint Directly
Use Postman/curl to test:
```bash
curl -X POST https://undefine-v2-back.vercel.app/api/guess \
  -H "Content-Type: application/json" \
  -H "player-id: 7a142730-bd4a-40e8-b386-cd07db98c6f7" \
  -d '{
    "gameId": "d526ca21-dc15-4879-a59d-f939f1f1d96a",
    "wordId": "c2ec041f-6ab3-4ece-b15e-db32db224030",
    "guess": "manmade",
    "start_time": "2025-11-30T..."
  }'
```

---

## Alternative: Keep Feature But Add Error Handling

Instead of disabling, add graceful error handling:

```typescript
// client/src/hooks/useGame.ts
const submitGuess = useCallback(async (guess: string) => {
  try {
    const data = await gameService.submitGuess(guess);
    // ... existing logic
  } catch (error) {
    console.error('[Game] Failed to submit guess:', error);
    
    // If this is an archive game, show friendly error
    if (gameState.isArchivePlay) {
      alert('Archive play is temporarily unavailable. Please play today\'s word instead.');
      // Offer to restart with today's word
      return;
    }
    
    throw error;
  }
}, [gameState]);
```

---

## Recommendation

**Option 1 (Safest):** Temporarily disable archive play
- Takes 1 minute
- Restores full functionality
- Can re-enable when fixed

**Option 2 (Better UX):** Add error handling
- Keep feature enabled
- Show helpful error message
- Offer fallback to today's word

**Option 3 (Proper Fix):** Debug and fix backend
- Requires backend log access
- Need to identify exact failure point
- Could take 1-2 hours

---

## My Recommendation

Let's do **Option 1** right now (disable temporarily), then work on **Option 3** (proper fix) when we have backend logs access.

The feature is 90% there - it just needs backend debugging which requires Vercel backend log access.

