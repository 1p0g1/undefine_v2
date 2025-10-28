# Un Diamond Color Scheme Documentation

## Overview
The Un diamond is a visual indicator in the Un-Define game that shows a player's theme guess status. The diamond changes color based on whether the player has guessed the weekly theme and how accurate their guess was.

## Color States

### 1. 🥇 **Gold** (Perfect Match)
**Condition**: Player guessed correctly with **100% confidence**
- **Background**: `#fef3c7` (Light gold)
- **Border**: `#f59e0b` (Amber)
- **Text**: `#b45309` (Dark amber)
- **Use Case**: Exact match or definitionally identical theme guess

### 2. 🟢 **Green** (Correct/High Confidence)
**Condition**: Player guessed correctly with **85-99% confidence**
- **Background**: `#f0fdf4` (Light green)
- **Border**: `#22c55e` (Green)
- **Text**: `#15803d` (Dark green)
- **Use Case**: Correct theme with high semantic similarity

### 3. 🟠 **Orange** (Medium Confidence)
**Condition**: Player guessed with **70-84% confidence**
- **Background**: `#fff7ed` (Light orange)
- **Border**: `#f97316` (Orange)
- **Text**: `#ea580c` (Dark orange)
- **Use Case**: Close guess but not quite correct, or partially correct

### 4. 🔴 **Red** (Low Confidence/Incorrect)
**Condition**: Player guessed with **<70% confidence**
- **Background**: `#fef2f2` (Light red)
- **Border**: `#ef4444` (Red)
- **Text**: `#dc2626` (Dark red)
- **Use Case**: Incorrect or very distant guess

### 5. 🟣 **Purple** (Call to Action)
**Condition**: Game complete, theme not guessed yet, **pulsating animation**
- **Background**: `#e0e7ff` (Light purple)
- **Border**: `#8b5cf6` (Purple)
- **Text**: `#8b5cf6` (Purple)
- **Special**: Includes pulsating animation to draw attention
- **Use Case**: Encourage player to guess theme after completing daily word

### 6. ⚪ **Neutral Gray** (Default)
**Condition**: Player has **not guessed** the theme yet
- **Background**: `#f8fafc` (Light gray)
- **Border**: `#64748b` (Slate gray)
- **Text**: `#1e293b` (Dark slate)
- **Use Case**: Default state before theme guess

## Implementation Locations

### 1. Player's Own View
**File**: `client/src/components/UnPrefix.tsx`
**Function**: `getDiamondColors()`
- Used in main game interface
- Shows current player's theme status
- Includes pulsating animation when applicable

### 2. Leaderboard View
**File**: `client/src/GameSummaryModal.tsx`
**Location**: Result column in Today's Results modal
- Shows theme status for all players in leaderboard
- Mini version (1.4rem) next to DEFINE boxes
- Dynamic coloring based on `theme_guess_data` from API

### 3. API Data Source
**File**: `pages/api/leaderboard.ts`
**Function**: `getCurrentDayLeaderboard()`
- Fetches theme guess data from `theme_attempts` table
- Joins with current word's theme
- Returns `theme_guess_data` object with:
  - `has_guessed`: boolean
  - `is_correct`: boolean
  - `confidence_percentage`: number | null

## Logic Flow

```typescript
// Priority order for color determination:
1. Check if player has guessed (`has_guessed`)
   - If NO → Neutral Gray (or Purple if game complete)
   
2. Check if guess was correct AND confidence === 100
   - If YES → 🥇 Gold
   
3. Check if guess was correct AND confidence >= 85
   - If YES → 🟢 Green
   
4. Check if confidence >= 70
   - If YES → 🟠 Orange
   
5. Otherwise → 🔴 Red (low confidence/incorrect)
```

## Database Schema

### Theme Attempts Table
```sql
theme_attempts (
  id uuid PRIMARY KEY,
  player_id uuid REFERENCES players(id),
  theme text NOT NULL,
  guess text NOT NULL,
  is_correct boolean NOT NULL,
  confidence_percentage integer,
  attempt_date date NOT NULL,
  created_at timestamp NOT NULL
)
```

## Design Rationale

1. **Gold for Perfect Matches**: Celebrates exceptional accuracy, encouraging players to be precise
2. **Green-Orange-Red Gradient**: Intuitive traffic light metaphor for guess quality
3. **Purple Pulsating**: Eye-catching call-to-action that stands out from other states
4. **Neutral Gray**: Non-intrusive default that doesn't distract from gameplay

## Future Enhancements

Potential additions to consider:
- Animated transitions between states
- Tooltip showing confidence percentage on hover
- Historical theme guess tracking
- Streak indicators for consecutive correct theme guesses

## Related Documentation
- Theme Matching System: `docs/THEME_MATCHING_SYSTEM.md`
- Leaderboard Implementation: `docs/LEADERBOARD_API.md`
- Color System: `docs/DESIGN_SYSTEM.md`

---
*Last Updated*: January 2025
*Version*: 2.0

