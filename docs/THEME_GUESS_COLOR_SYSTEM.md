# Theme Guess Color System

**Updated: July 2025**

## Overview

The Un diamond and theme guess interface use a consistent color coding system based on semantic similarity scores to provide visual feedback about how close a theme guess is to the actual theme.

## Color Thresholds

| Similarity Range | Color | Hex Code | Meaning | Visual Examples |
|-----------------|-------|----------|---------|-----------------|
| **85%+** | 🟢 Green | `#059669` | Effectively correct (high confidence) | Un diamond, text, progress bars |
| **70-85%** | 🟠 Orange | `#d97706` | Very close but not quite correct | Un diamond, text, progress bars |  
| **0-69%** | 🔴 Red | `#dc2626` | Incorrect/far from correct | Un diamond, text, progress bars |
| **No guess** | 🔵 Blue | `#1a237e` | Default state (no theme guess made) | Un diamond, text |
| **Correct** | 🟢 Green | `#059669` | Always green regardless of similarity % | Overrides similarity-based colors |

## Implementation Details

### Functions

- **`getUnDiamondColor(confidence, isCorrect)`**: Colors Un diamonds and modal text
- **`getSimilarityBarColor(confidence)`**: Colors similarity progress bars
- **`getSimilarityBarColorWithCorrect(confidence, isCorrect)`**: Colors bars with correct override

### Usage Locations

1. **Main Page Un Diamond** (`UnPrefix.tsx`)
2. **Theme Modal Header Text** (`ThemeGuessModal.tsx`)
3. **Theme Modal Un Diamond** (`ThemeGuessModal.tsx`)
4. **Similarity Progress Bars** (`ThemeGuessModal.tsx`)

## Rationale

- **85%+ threshold for green**: Ensures only high-confidence matches appear "correct"
- **70-85% orange zone**: Captures "very close" guesses that shouldn't look like wins
- **Consistent across all UI elements**: Diamond colors match text colors match progress bars
- **Overrides for actual correct guesses**: True matches are always green regardless of similarity score

## Bug Fix (July 2025)

**Problem**: 77% similarity was showing green (looked like success) but feedback said "Very, very close..." (indicating not quite correct)

**Solution**: Moved 70-85% range to orange, reserving green for 85%+ only

This ensures visual consistency between colors and feedback messages. 