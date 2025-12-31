# Offline Capability Assessment

*Parked for future implementation - December 2024*

## Current Status: ⚠️ Limited Offline Support

### ✅ What PERSISTS (localStorage)

| Data | Storage Key | Behavior |
|------|-------------|----------|
| Player ID | `playerId` | Survives refresh, persists forever |
| Game State | `undefine_game_state` | Full game state including clues, guesses, timer |
| Session ID | Within game state | Tracks if game was completed this session |

The game state saves:
- `gameId`, `wordId`, `wordText`
- All clues (definition, equivalents, first_letter, etc.)
- Guesses made so far
- `revealedClues` array
- `isComplete`, `isWon`, `score`
- `startTime`, `endTime`
- Archive metadata (`isArchivePlay`, `gameDate`)

---

### ❌ What REQUIRES Network (Will Fail Offline)

| Action | API Endpoint | Offline Behavior |
|--------|--------------|------------------|
| **Start Game** | `GET /api/word` | 🔴 Fails - can't get today's word |
| **Submit Guess** | `POST /api/guess` | 🔴 Fails - can't validate |
| **Theme Status** | `GET /api/theme-status` | 🔴 Fails |
| **Theme Guess** | `POST /api/theme-guess` | 🔴 Fails |
| **Leaderboard** | `GET /api/leaderboard` | 🔴 Fails |
| **Bonus Round** | `POST /api/bonus/check-guess` | 🔴 Fails |
| **Streak Data** | `POST /api/streak-status` | 🔴 Fails |
| **Archive Game** | `GET /api/word?date=...` | 🔴 Fails |

---

### 📊 Scenario Analysis

#### Scenario 1: Player mid-game, loses wifi
```
Player has made 3 guesses, goes into tunnel
├── Can see: Current clues, guesses made, timer
├── Cannot: Submit new guesses (API error)
├── Timer: Keeps ticking locally (pointless)
├── If refreshes: Game state restores from localStorage
└── When back online: Can resume and submit guesses
```
**Verdict: Partial - can view progress, cannot continue**

#### Scenario 2: Completed game, loses wifi before results
```
Player wins the game, wifi drops
├── Game completion: Saved locally ✅
├── Leaderboard: Won't load (API needed)
├── Theme guess: Won't work
├── Bonus round: Won't work
└── When back online: Can see everything
```
**Verdict: Partial - knows they won, can't see extras**

#### Scenario 3: First-time visitor offline
```
Player opens game with no connection
├── App shell: Won't load (no service worker)
├── Everything: 🔴 Complete failure
└── Shows: Browser "offline" error
```
**Verdict: Complete failure**

#### Scenario 4: Returning visitor, had game yesterday, offline today
```
Player completed game yesterday, opens today offline
├── localStorage: Has yesterday's completed state
├── API check: Fails to get today's word
├── Shows: Error or stale data
└── Doesn't know: It's a new day
```
**Verdict: Confusing - sees old game, can't play new**

---

### 🔧 Missing Infrastructure

| Feature | Status | Impact |
|---------|--------|--------|
| Service Worker | ❌ Not implemented | Can't cache app shell |
| PWA Manifest | ❌ Not implemented | Can't "install" app |
| Offline Queue | ❌ Not implemented | Can't queue guesses |
| Offline Detection | ❌ Not implemented | No "offline" banner |
| Optimistic UI | ❌ Not implemented | No local validation |

---

## 💡 Future Recommendations

### 1. Add offline detection banner
```typescript
// Simple offline detector
window.addEventListener('offline', () => showOfflineBanner());
window.addEventListener('online', () => hideOfflineBanner());
```

### 2. Add PWA service worker
```javascript
// vite-plugin-pwa would handle this
// Cache: index.html, JS bundles, fonts, CSS
```

### 3. Optimistic guess queue
```typescript
// In submitGuess, if offline:
// - Validate locally (basic checks)
// - Store in queue
// - Show "will sync when online"
```

---

*This document saved for future implementation when offline support becomes a priority.*

