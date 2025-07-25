# Un·Define Theme Tracking System Documentation

## 🎯 **Overview**

The **Un Theme Tracking System** allows players to guess the weekly theme connecting the themed words, with immediate visual feedback through the iconic "Un" diamond that changes color based on guess accuracy.

---

## 🎨 **Visual System - The Un Diamond**

### **Color Coding (Updated July 2025)**
```typescript
// Theme Guess Color System
0-69%   = Red (#dc2626)    - Incorrect/far from correct
70-85%  = Orange (#d97706) - Very close but not quite correct  
85%+    = Green (#059669)  - Effectively correct (high confidence)
Correct = Green (#059669)  - Always green regardless of confidence
```

### **Implementation**
- **Location**: `client/src/components/UnPrefix.tsx`
- **Styling**: `client/src/utils/themeMessages.ts`
- **Color Function**: `getUnDiamondColor(confidence, isCorrect)`

---

## 🔄 **Immediate Update System**

### **How It Works Like Magic**
```typescript
// In ThemeGuessModal.tsx - handleSubmit()
const response = await apiClient.submitThemeGuess({...});

// ✅ IMMEDIATE local state update from API response
setThemeGuessData({
  hasGuessedToday: true,
  isCorrectGuess: response.isCorrect,
  confidencePercentage: response.fuzzyMatch?.confidence || null
});

// ✅ Pass data to parent App.tsx via callback
if (onThemeDataUpdate) {
  onThemeDataUpdate(themeGuessData);
}
```

### **Key Components**
1. **ThemeGuessModal**: Handles theme guessing UI and immediate state updates
2. **UnPrefix**: Renders the diamond with dynamic colors
3. **App.tsx**: Manages theme data state and modal interactions

---

## 🗄️ **Database Schema**

### **Core Tables**
```sql
-- Theme attempts tracking
theme_attempts (
  id uuid PRIMARY KEY,
  player_id text REFERENCES players(id),
  theme text NOT NULL,
  guess text NOT NULL,
  is_correct boolean NOT NULL,
  attempt_date date NOT NULL,
  confidence_percentage integer,
  matching_method text
);

-- Words with theme information
words (
  id uuid PRIMARY KEY,
  word text NOT NULL,
  theme text, -- Weekly theme identifier
  date date NOT NULL
);
```

### **Theme Progress Tracking**
- **Current week's themed words** completed by player
- **Theme guess status** (attempted, correct/incorrect)
- **Confidence scoring** via semantic similarity

---

## 🔧 **API Endpoints**

### **Theme Status** (`/api/theme-status`)
```typescript
interface ThemeStatusResponse {
  currentTheme?: string | null;           // Only revealed if guessed correctly
  hasActiveTheme: boolean;                // Whether theme exists this week
  progress: {
    totalWords: number;                   // Total themed words this week
    completedWords: number;               // Player's completed words
    themeGuess: string | null;           // Player's theme guess
    canGuessTheme: boolean;              // Eligibility to guess
    hasGuessedToday: boolean;            // Already attempted today
    isCorrectGuess: boolean;             // Guess was correct
    confidencePercentage: number | null; // Similarity confidence
  };
  weeklyThemedWords: ThemedWord[];        // Player's completed themed words
}
```

### **Theme Guess Submission** (`/api/theme-guess`)
```typescript
interface ThemeGuessResponse {
  isCorrect: boolean;                     // Exact match found
  guess: string;                          // Player's guess
  actualTheme?: string;                   // Revealed if correct
  fuzzyMatch: {
    method: 'exact' | 'synonym' | 'semantic' | 'error';
    confidence: number;                   // 0-100 similarity score
    similarity?: number;                  // Semantic similarity value
  };
}
```

---

## 🎯 **Theme Logic**

### **Weekly Theme System**
- **Theme Duration**: Monday to Sunday
- **Word Selection**: Themed words scattered throughout the week
- **Guess Eligibility**: Must complete at least one themed word
- **Reveal Condition**: Only correct guesses reveal the actual theme

### **Semantic Matching**
```typescript
// Fuzzy matching hierarchy (server/theme.ts)
1. Exact match (100% confidence)
2. Synonym match (90% confidence) 
3. Semantic similarity via HuggingFace API (variable confidence)
4. Error handling (0% confidence)
```

---

## 💾 **State Management**

### **Local State (Immediate Updates)**
```typescript
// In ThemeGuessModal.tsx
const [themeGuessData, setThemeGuessData] = useState<{
  hasGuessedToday: boolean;
  isCorrectGuess: boolean;
  confidencePercentage: number | null;
}>();

// In App.tsx (receives updates via callback)
const [themeGuessData, setThemeGuessData] = useState<ThemeGuessData | null>(null);
```

### **Caching Strategy**
- **Cache Duration**: 2 minutes for theme status
- **Cache Invalidation**: On new theme guess submission
- **Fallback**: Fresh API call if cache expired

---

## 🔍 **Testing & Debugging**

### **Console Logs to Monitor**
```javascript
[ThemeGuessModal] Theme guess response: {isCorrect, confidence}
[ThemeGuessModal] Updated theme status with new guess data
[App] Theme data updated via callback: {hasGuessedToday, isCorrectGuess}
```

### **Common Issues**
1. **Theme not appearing**: Check if `hasActiveTheme` is true
2. **Colors not updating**: Verify `getUnDiamondColor` function
3. **Cache issues**: Check 2-minute cache timestamp
4. **API errors**: Verify HuggingFace API key for semantic matching

---

## 🚀 **Success Metrics**

✅ **Immediate visual feedback** (Un diamond color change)  
✅ **No API delays** (local state updates)  
✅ **Consistent color coding** across all UI elements  
✅ **Semantic similarity scoring** for close guesses  
✅ **Weekly theme progression** tracking  

---

*This system demonstrates the power of **immediate local state updates** combined with **semantic AI matching** for engaging user experiences.* 