# Scoring System Analysis - Current Weightings

## 🎯 **Current Scoring Factors**

### **1. Base Score by Guess Number**
```typescript
GUESS_BASE_SCORES: [1000, 900, 800, 700, 600, 500]
```
- **Drop per guess**: 100 points
- **Total range**: 500 points (1000 → 500)
- **Incentive**: Rewards early guessing

### **2. Fuzzy Bonus**
```typescript
FUZZY_BONUS: 50 points per match
```
- **Purpose**: Reward helpful typo corrections
- **Timing**: Most relevant after Guess 2 (post-equivalents)
- **Incentive**: Encourages accurate spelling attempts

### **3. Time Penalty**
```typescript
TIME_PENALTY_PER_10_SECONDS: 1 point per 10 seconds
```
- **Rate**: 6 points per minute, 60 points per 10 minutes
- **Impact**: Very mild - less than 1 guess level even for long games
- **Incentive**: Slight push toward faster play

### **4. Hint Penalty (Future)**
```typescript
HINT_PENALTY: 200 points
```
- **Impact**: Equivalent to 2 guess levels
- **Incentive**: Strong discouragement of hint usage

## 📊 **Scoring Scenarios Analysis**

### **Perfect Game Examples**
```
Guess 1, 30s, no fuzzy: 1000 - 3 = 997 points
Guess 1, 2min, no fuzzy: 1000 - 12 = 988 points
Guess 1, 10min, no fuzzy: 1000 - 60 = 940 points
```

### **Good Game Examples**
```
Guess 2, 1 fuzzy, 30s: 900 + 50 - 3 = 947 points
Guess 2, 2 fuzzy, 1min: 900 + 100 - 6 = 994 points
Guess 3, 1 fuzzy, 30s: 800 + 50 - 3 = 847 points
```

### **Average Game Examples**
```
Guess 3, no fuzzy, 1min: 800 - 6 = 794 points
Guess 4, 1 fuzzy, 2min: 700 + 50 - 12 = 738 points
Guess 5, 2 fuzzy, 1min: 600 + 100 - 6 = 694 points
```

## 🎮 **Game Mechanics Impact**

### **Guess Flow & Scoring Alignment**
1. **Guess 1**: Definition → Player takes wild guess
2. **Guess 2**: Equivalents → Player gets semantic help  
3. **Guess 3+**: Player knows concept → Fuzzy helps with spelling

### **Key Observations**
- **Fuzzy timing**: Most valuable after Guess 2 when player has semantic understanding
- **Time vs accuracy**: 1 fuzzy match (50 points) = 8+ minutes of time penalty
- **Guess progression**: Each guess drop (100 points) = 16+ minutes of time penalty

## ⚖️ **Weighting Assessment**

### **✅ Working Well**
1. **Base score progression**: 100-point drops create clear incentive for early guessing
2. **Fuzzy bonus significance**: 50 points makes spelling help worthwhile
3. **Time penalty mildness**: Doesn't punish thoughtful play excessively

### **🤔 Potential Issues**
1. **Time penalty too mild?**: Even 10-minute games lose minimal points
2. **Fuzzy bonus timing**: Should it be higher for post-equivalents guesses?
3. **Hint penalty**: 200 points might be too harsh vs current mild time penalty

## 📈 **Comparison Examples**

### **Speed vs Accuracy Tradeoff**
```
Player A: Guess 2, 30s, no fuzzy = 897 points
Player B: Guess 3, 30s, 1 fuzzy = 847 points
Player C: Guess 2, 5min, 1 fuzzy = 947 points
```

**Insight**: Player C (slower but with fuzzy help) scores highest!

### **Time Tolerance Analysis**
```
To lose 100 points (1 guess level) via time:
100 points ÷ 1 point/10s = 1000 seconds = 16.7 minutes
```

**Insight**: Time penalty is very forgiving - allows thoughtful play

## 🎯 **Scoring Philosophy Questions**

1. **Should time matter more?** Current system heavily favors accuracy over speed
2. **Should fuzzy bonus scale?** Higher bonus for later guesses when spelling matters most?
3. **Is hint penalty balanced?** 200 points vs mild time penalty seems inconsistent
4. **Should we reward semantic understanding?** Currently only base score progression does this

## 🔍 **Recommended Analysis**

Need to decide on game's core values:
- **Accuracy vs Speed**: Current system favors accuracy
- **Semantic vs Spelling**: Both rewarded through different mechanisms  
- **Risk vs Reward**: Fuzzy system encourages spelling attempts
- **Difficulty balance**: Time penalty keeps games accessible

## 📊 **Scoring Distribution Impact**

Current weightings create these natural score ranges:
- **Excellent**: 900-1000 points (Guess 1-2, quick, maybe fuzzy)
- **Good**: 800-900 points (Guess 2-3, reasonable time)
- **Average**: 700-800 points (Guess 3-4, some time/fuzzy)
- **Poor**: 500-700 points (Guess 5-6, slow, minimal help)

This creates a good spread without being too punishing. 