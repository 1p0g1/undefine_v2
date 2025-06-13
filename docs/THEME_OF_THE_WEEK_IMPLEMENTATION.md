# Theme of the Week Feature - Implementation Documentation

## Overview
The Theme of the Week feature allows players to guess the weekly theme that connects a set of 7 words throughout the week. Players can make one guess per day and earn statistics tracking their theme guessing performance.

## Feature Specifications

### Core Functionality
- **Weekly Themes**: 7 words per week (Monday-Sunday) share a common theme
- **Daily Guessing**: One theme guess attempt per player per day
- **Progress Tracking**: Players can see how many themed words they've completed
- **Statistics**: Comprehensive tracking of theme guessing performance
- **Fuzzy Matching**: Accepts variations (e.g., "emotions" = "feelings", "moods")

### User Interface
- **Access**: Click the 'Un·' diamond to open theme guessing modal
- **Modal Interface**: Shows progress, current status, guess input, and statistics
- **Visual Feedback**: Clear indication of correct/incorrect guesses
- **Daily Constraints**: Prevents multiple attempts per day

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

#### Theme Guess Submission
1. User clicks 'Un·' diamond → Opens modal
2. Modal loads current theme status and player statistics
3. User enters guess → Validates locally
4. Submit → API checks daily constraint
5. API validates guess with fuzzy matching
6. Statistics recorded at submission time
7. Response returned with success/failure
8. Modal updates with new status

#### Progress Tracking
1. Game completion triggers theme word check
2. Theme progress calculated across all themed words
3. Player eligibility determined (≥1 word completed)
4. Modal displays current progress visually

## Sample Data

### Current Theme (December 9-15, 2024)
**Theme**: "emotions"
**Words**: HAPPY, ANGRY, EXCITED, NERVOUS, CALM, JEALOUS, PROUD

### Example Statistics Response
```json
{
  "totalThemeAttempts": 5,
  "correctThemeGuesses": 3,
  "averageAttemptsPerTheme": 1.25,
  "averageWordsCompletedWhenGuessing": 2.4,
  "themesGuessed": ["emotions", "colors", "animals"]
}
```

## User Experience

### Access Flow
1. Player completes at least one themed word
2. Clicks 'Un·' diamond (enhanced with click cursor)
3. Modal opens showing:
   - Weekly progress (X/7 words completed)
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