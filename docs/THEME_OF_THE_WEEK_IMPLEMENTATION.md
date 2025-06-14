# Theme of the Week Feature - Implementation Documentation

## Overview
The Theme of the Week feature allows players to guess the weekly theme that connects a set of 7 words throughout the week. Players can make one guess per day and earn statistics tracking their theme guessing performance.

## Feature Specifications

### Core Functionality
- **Weekly Themes**: 7 words per week (Monday-Sunday) share a common theme
- **Daily Guessing**: One theme guess attempt per player per day
- **Progress Tracking**: Players can see how many themed words they've completed
- **Weekly Words Display**: When attempting theme guess, show only the words from current week that the player has already completed
- **Statistics**: Comprehensive tracking of theme guessing performance
- **Fuzzy Matching**: Accepts variations (e.g., "emotions" = "feelings", "moods")

### User Interface
- **Access**: Click the 'Un·' diamond to open theme guessing modal
- **Modal Interface**: Shows progress, current status, guess input, weekly words, and statistics
- **Weekly Words Section**: Displays only the themed words from current week that player has completed
- **Visual Feedback**: Clear indication of correct/incorrect guesses
- **Daily Constraints**: Prevents multiple attempts per day

### Weekly Words Display Logic
When a player clicks the 'Un·' diamond to attempt theme guessing:

1. **Week Calculation**: Determine current theme week (Monday-Sunday)
2. **Word Filtering**: Find all words from current week that have theme matching current week's theme
3. **Player Progress**: Check which of these themed words the player has actually completed
4. **Display**: Show only completed themed words from current week (not all-time themed words)

**Example Scenarios**:
- Week: Dec 9-15, 2024 (Theme: "emotions")
- Themed words: HAPPY (Mon), ANGRY (Tue), EXCITED (Wed), NERVOUS (Thu), CALM (Fri), JEALOUS (Sat), PROUD (Sun)
- Player logged in Mon, Wed, Fri and completed those words
- **Display**: Only show HAPPY, EXCITED, CALM (3 words) when attempting theme guess
- **Progress**: "3/7 themed words completed this week"

**Important Notes**:
- Only show words from CURRENT theme week (Monday-Sunday)
- Only show words the player has actually completed/solved
- If player hasn't completed any themed words this week, they cannot attempt theme guess
- Reset weekly progress every Monday (new theme week begins)

## Implementation Details

### 1. Database Schema

#### New Table: `theme_attempts`
```sql
CREATE TABLE theme_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES user_stats(player_id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  guess TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_completed_when_guessed INTEGER DEFAULT 0,
  total_word_guesses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensures one guess per player per theme per day
  UNIQUE(player_id, theme, attempt_date)
);
```

#### Updated `words` Table
```sql
ALTER TABLE words ADD COLUMN theme TEXT;
```

### 2. Backend Implementation

#### Core Theme Logic (`src/game/theme.ts`)
- **`getThemeForDate()`**: Determines theme for specific date using weekly calculation
- **`isThemeGuessCorrect()`**: Validates guesses with fuzzy matching
- **`submitThemeAttempt()`**: Handles daily constraint and statistics tracking
- **`getThemeProgress()`**: Returns player progress and status
- **`getPlayerThemeStats()`**: Comprehensive statistics calculation

#### API Endpoints

##### `POST /api/theme-guess`
- Submits theme guesses with validation
- Enforces daily constraint
- Tracks statistics at guess time
- Returns success/failure with feedback

##### `GET /api/theme-status`
- Returns current theme and player progress
- Includes daily status (already guessed, can guess, etc.)
- Shows completion progress across themed words

##### `GET /api/theme-stats`
- Returns comprehensive player statistics
- Total attempts, success rate, average performance
- Historical theme guess data

### 3. Frontend Implementation

#### Components

##### `ThemeGuessModal.tsx`
- **Purpose**: Main interface for theme guessing
- **Features**: 
  - Progress visualization
  - Status indicators (already guessed, need to complete words, etc.)
  - Guess input with real-time validation
  - Statistics display grid
  - Toast notifications for feedback

##### Updated `App.tsx`
- **Integration**: Added theme modal state management
- **Trigger**: UnPrefix component onClick handler
- **Modal Management**: Show/hide functionality

##### Updated `UnPrefix.tsx`
- **Enhancement**: Added optional onClick prop
- **Functionality**: Maintains existing time-based celestial design
- **Accessibility**: Cursor pointer when clickable

#### API Client Updates (`client/src/api/client.ts`)
- **`submitThemeGuess()`**: Submit theme attempts
- **`getThemeStatus()`**: Fetch current status and progress
- **`getThemeStats()`**: Retrieve player statistics

### 4. Business Logic

#### Weekly Words Display Logic
```typescript
// Get current theme week boundaries
const getThemeWeekBoundaries = (date: Date) => {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + 1); // Get Monday
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // Get Sunday
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
};

// Get player's completed themed words for current week
const getPlayerWeeklyThemedWords = async (playerId: string, theme: string) => {
  const { monday, sunday } = getThemeWeekBoundaries(new Date());
  
  // Find all words from current week with matching theme
  const themedWords = await supabase
    .from('words')
    .select('*')
    .eq('theme', theme)
    .gte('date', monday.toISOString().split('T')[0])
    .lte('date', sunday.toISOString().split('T')[0]);
  
  // Find which ones player has completed
  const completedWords = await supabase
    .from('scores')
    .select('word_id, words(*)')
    .eq('player_id', playerId)
    .in('word_id', themedWords.data?.map(w => w.id) || [])
    .not('completion_time_sec', 'is', null);
  
  return completedWords.data || [];
};
```

#### Daily Constraint Enforcement
```typescript
// Database constraint ensures one attempt per day
UNIQUE(player_id, theme, attempt_date)

// API validation
if (existingAttempt) {
  return { alreadyGuessedToday: true };
}
```

#### Statistics Tracking
- **Words Completed When Guessing**: Number of themed words player had solved
- **Total Word Guesses**: Cumulative guesses across all game sessions
- **Success Rate**: Percentage of correct theme guesses
- **Average Performance**: Words typically completed before guessing

#### Fuzzy Matching Logic
```typescript
const synonymMap = {
  'emotions': ['feelings', 'moods', 'sentiments'],
  'space': ['astronomy', 'cosmos', 'universe', 'celestial'],
  // ... additional mappings
};
```

### 5. Data Flow

#### Weekly Words Display Flow
1. User clicks 'Un·' diamond → Opens modal
2. Modal calculates current theme week (Monday-Sunday boundaries)
3. Fetches all themed words from current week
4. Filters to only words player has completed
5. Displays completed themed words with count (e.g., "3/7 themed words completed")
6. Enables/disables theme guessing based on completion count (≥1 required)

#### Theme Guess Submission
1. User clicks 'Un·' diamond → Opens modal
2. Modal loads current theme status and player statistics
3. User enters guess → Validates locally
4. Submit → API checks daily constraint
5. API validates guess with fuzzy matching
6. Statistics recorded at submission time
7. Response returned with success/failure
8. Modal updates with new status

## Sample Data

### Weekly Words Display Example
**Current Week**: Example week
**Theme**: [Your curated theme]
**Display in Modal**:
```json
{
  "weeklyThemedWords": [
    {
      "word": "EXAMPLE_WORD",
      "date": "2024-12-09",
      "completedOn": "2024-12-09T10:30:00Z"
    }
  ],
  "weekProgress": {
    "completed": 1,
    "total": 7,
    "canGuessTheme": true
  }
}
```

### Example Statistics Response
```json
{
  "totalThemeAttempts": 5,
  "correctThemeGuesses": 3,
  "averageAttemptsPerTheme": 1.25,
  "averageWordsCompletedWhenGuessing": 2.4,
  "themesGuessed": ["theme1", "theme2", "theme3"]
}
```

## User Experience

### Weekly Words Section
- **Title**: "This Week's Themed Words" or "Words You've Completed This Week"
- **Display**: List of completed themed words from current week only
- **Format**: Word name with completion date/day
- **Progress Indicator**: "X/7 themed words completed this week"
- **Empty State**: "Complete at least one themed word this week to guess the theme"

### Access Flow
1. Player completes at least one themed word from current week
2. Clicks 'Un·' diamond (enhanced with click cursor)
3. Modal opens showing:
   - Weekly progress (X/7 themed words completed this week)
   - List of completed themed words from current week
   - Current guess status
   - Input field (if eligible)
   - Personal statistics

### Feedback States
- **🔒 Locked**: Must complete themed word first
- **📝 Available**: Can make guess (input shown)
- **✅ Correct**: Green success state with theme revealed
- **❌ Incorrect**: Red error state, try again tomorrow
- **⏰ Already Guessed**: Information about existing guess

### Statistics Display
- **Themes Guessed**: Total successful theme identifications
- **Success Rate**: Percentage of correct attempts
- **Avg Words Done**: Average words completed when guessing
- **Total Attempts**: Overall theme guess count

## Technical Features

### Performance Optimizations
- **Parallel API Calls**: Theme status and statistics loaded simultaneously
- **Efficient Queries**: Indexed database queries for fast lookups
- **Caching**: API responses use appropriate cache headers

### Error Handling
- **Network Failures**: Graceful degradation with user feedback
- **Validation Errors**: Clear messaging for invalid inputs
- **Constraint Violations**: Friendly messaging for daily limits

### Security
- **Player Validation**: All requests validate player existence
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: API endpoints respect standard limits

## Future Enhancements

### Planned Features
1. **Hint System**: Optional hints for difficult themes
2. **Theme Leaderboards**: Weekly rankings for theme guessing
3. **Streak Tracking**: Consecutive correct theme guesses
4. **Theme History**: Browse past weekly themes
5. **Social Features**: Share theme guess results

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live progress
2. **Mobile Optimization**: Enhanced mobile theme modal experience
3. **Accessibility**: Screen reader improvements
4. **Analytics**: Enhanced tracking for theme difficulty tuning

## Deployment Notes

### Database Migration
```bash
# Run the theme_attempts table migration
supabase db reset --linked
```

### Feature Flags
- Feature is enabled by default
- No configuration changes required
- Backward compatible with existing data

### Monitoring
- Track theme guess success rates
- Monitor API response times
- Watch for daily constraint violations

## Testing Recommendations

### Manual Testing
1. **Daily Constraint**: Verify one guess per day enforcement
2. **Progress Tracking**: Complete themed words, check progress
3. **Statistics**: Submit multiple guesses, verify calculations
4. **Edge Cases**: Test with no active theme, no completed words

### Automated Testing
1. **API Endpoints**: Unit tests for all theme endpoints
2. **Database Constraints**: Verify unique constraint enforcement
3. **Fuzzy Matching**: Test synonym recognition
4. **Statistics Calculation**: Verify mathematical accuracy

---

## Summary

The Theme of the Week feature is now fully implemented with:
- ✅ Complete backend infrastructure
- ✅ Daily constraint enforcement  
- ✅ Comprehensive statistics tracking
- ✅ Polished user interface
- ✅ Robust error handling
- ✅ Performance optimizations

Players can now click the 'Un·' diamond to access theme guessing with full statistics tracking and a beautiful, intuitive interface. 