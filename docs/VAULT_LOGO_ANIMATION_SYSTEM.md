# Vault Logo Animation System

**Created: January 2026**

## Overview

The Vault Logo replaces the original "Un" diamond shape with a series of PNG images that animate based on the player's theme guess status. This creates a visual metaphor of "unlocking" the weekly theme.

## Image Assets

All images are located in `client/public/` and are designed to be **exactly the same size and placement** so they can be swapped seamlessly without repositioning.

### Primary Vault States (Green/Successful - 80%+)

| Image | Filename | Purpose |
|-------|----------|---------|
| 🔒 Closed Vault | `ClosedVault.png` | Default state before theme is guessed |
| ✨ Shine Key | `ShineKeyVault.png` | Transition frame showing key insertion/shine effect |
| 🚪 Ajar Vault | `AjarVault.png` | Door beginning to open |
| 🚪 Ajar Vault 2 | `AjarVault2.png` | Door continues opening |
| 🔓 Open Vault | `OpenVault.png` | Final state after theme is correctly guessed (80%+) |

### Orange Vault States (Close - 70-79%)

| Image | Filename | Purpose |
|-------|----------|---------|
| 🟠 Orange | `Orange.png` | Base orange state for "close but not quite" |
| 🟠 Orange Left | `OrangeLeft.png` | Shake animation - tilted left |
| 🟠 Orange Right | `OrangeRight.png` | Shake animation - tilted right |

### Red Vault States (Incorrect - <70%)

| Image | Filename | Purpose |
|-------|----------|---------|
| 🔴 Red | `Red.png` | Base red state for incorrect guess |
| 🔴 Red Left | `RedLeft.png` | Shake animation - tilted left |
| 🔴 Red Right | `RedRight.png` | Shake animation - tilted right |

## Current Placement (Pre-Implementation)

The original "Un" diamond sits in the `define-header` container in `App.tsx`:

```
Location: client/src/App.tsx (lines ~629-679)
Container: .define-header (flexbox, center-justified)
Component: <UnPrefix />
```

**Current CSS Properties:**
- Base size: `clamp(2.8rem, 7.5vw, 3.2rem)` (width and height)
- Transform: `rotate(45deg)` (creates diamond from square)
- Position: Flexbox item, left of D.E.F.I.N.E. boxes
- Gap from DEFINE boxes: `clamp(0.1rem, 0.4vw, 0.2rem)`
- Currently **UNDERLAPS** the first "D" box (z-index not explicitly set)

**Desired Behavior:**
- New vault images should **OVERLAP** the first "D" box (higher z-index)
- Same positioning, but images replace the rotated square entirely

## State Machine

### Score Thresholds

| Score Range | Result | Animation | Persistent State |
|-------------|--------|-----------|------------------|
| **80%+** | ✅ Correct (Green) | Vault unlock sequence | `OpenVault.png` |
| **70-79%** | 🟠 Close (Orange) | Orange shake sequence | `Orange.png` |
| **<70%** | 🔴 Incorrect (Red) | Red shake sequence | `Red.png` |

### Main Page States

| State | Image Shown | Condition |
|-------|-------------|-----------|
| **Pre-Guess** | `ClosedVault.png` | Theme not guessed yet |
| **Post-Guess (80%+)** | `OpenVault.png` | Theme guessed with 80%+ confidence |
| **Post-Guess (70-79%)** | `Orange.png` | Close but not quite unlocked |
| **Post-Guess (<70%)** | `Red.png` | Incorrect guess |

**Note:** The main page always shows the **highest** score achieved that week, so if a player improves their score, the vault will update accordingly.

### Theme Popup Animation Sequences

#### Green/Success Animation (80%+ Score)

When a player submits a **successful** theme guess (80%+), the vault unlock animation plays:

| Step | Duration | Image | Purpose |
|------|----------|-------|---------|
| 1 | 300ms | `ClosedVault.png` | Starting state |
| 2 | 400ms | `ShineKeyVault.png` | Key glows/shines |
| 3 | 200ms | `ClosedVault.png` | Return to closed (highlights shine effect) |
| 4 | 350ms | `AjarVault.png` | Door begins to open |
| 5 | 350ms | `AjarVault2.png` | Door continues opening |
| 6 | Hold | `OpenVault.png` | Final open state |

**Total Animation Duration:** ~1.6 seconds

#### Orange/Close Animation (70-79% Score)

When a player submits a **close** theme guess (70-79%), the orange shake animation plays:

| Step | Duration | Image | Purpose |
|------|----------|-------|---------|
| 1 | 200ms | `Orange.png` | Starting state |
| 2 | 150ms | `OrangeLeft.png` | Shake left |
| 3 | 150ms | `Orange.png` | Return to center |
| 4 | 150ms | `OrangeRight.png` | Shake right |
| 5 | Hold | `Orange.png` | Final state |

**Total Animation Duration:** ~0.65 seconds

#### Red/Incorrect Animation (<70% Score)

When a player submits an **incorrect** theme guess (<70%), the red shake animation plays:

| Step | Duration | Image | Purpose |
|------|----------|-------|---------|
| 1 | 200ms | `Red.png` | Starting state |
| 2 | 150ms | `RedLeft.png` | Shake left |
| 3 | 150ms | `Red.png` | Return to center |
| 4 | 150ms | `RedRight.png` | Shake right |
| 5 | Hold | `Red.png` | Final state |

**Total Animation Duration:** ~0.65 seconds

### Animation Pseudocode

```typescript
// Score thresholds
const SCORE_THRESHOLD_GREEN = 80; // 80%+ = successful unlock
const SCORE_THRESHOLD_ORANGE = 70; // 70-79% = close

// Green unlock sequence (80%+)
const VAULT_UNLOCK_SEQUENCE = [
  { image: 'ClosedVault.png', duration: 300 },
  { image: 'ShineKeyVault.png', duration: 400 },
  { image: 'ClosedVault.png', duration: 200 },
  { image: 'AjarVault.png', duration: 350 },
  { image: 'AjarVault2.png', duration: 350 },
  { image: 'OpenVault.png', duration: 0 } // Final state, holds
];

// Orange shake sequence (70-79%)
const ORANGE_SHAKE_SEQUENCE = [
  { image: 'Orange.png', duration: 200 },
  { image: 'OrangeLeft.png', duration: 150 },
  { image: 'Orange.png', duration: 150 },
  { image: 'OrangeRight.png', duration: 150 },
  { image: 'Orange.png', duration: 0 } // Final state
];

// Red shake sequence (<70%)
const RED_SHAKE_SEQUENCE = [
  { image: 'Red.png', duration: 200 },
  { image: 'RedLeft.png', duration: 150 },
  { image: 'Red.png', duration: 150 },
  { image: 'RedRight.png', duration: 150 },
  { image: 'Red.png', duration: 0 } // Final state
];

// Choose animation based on score
function getAnimationSequence(score: number) {
  if (score >= SCORE_THRESHOLD_GREEN) return VAULT_UNLOCK_SEQUENCE;
  if (score >= SCORE_THRESHOLD_ORANGE) return ORANGE_SHAKE_SEQUENCE;
  return RED_SHAKE_SEQUENCE;
}
```

## Implementation Components

### 1. VaultLogo Component (New)

Replace `UnPrefix.tsx` functionality with a new image-based component:

```typescript
interface VaultLogoProps {
  onClick?: () => void;
  themeGuessData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  };
  // For animation in theme modal
  animating?: boolean;
  animationFrame?: string;
}
```

### 2. Main Page Usage

```tsx
<VaultLogo
  onClick={handleThemeClick}
  themeGuessData={themeGuessData}
/>
```

Shows `ClosedVault.png` or `OpenVault.png` based on `themeGuessData.isCorrectGuess`.

### 3. Theme Modal Usage

```tsx
<VaultLogo
  animating={isPlayingAnimation}
  animationFrame={currentAnimationFrame}
/>
```

Modal controls the animation sequence and passes current frame.

## Size Configurations

The VaultLogo component supports three size modes:

| Mode | Size | Margin | Use Case |
|------|------|--------|----------|
| **Default (main page)** | `clamp(4.5rem, 12vw, 5.5rem)` | `-0.8rem` | Main game header, 70% larger than original |
| **Scaled** | `clamp(4rem, 10vw, 5rem)` | `-0.3rem` | Smaller modal contexts |
| **Large** | `clamp(7rem, 18vw, 9rem)` | `0` | Theme modal animation showcase (2.5x) |

### Size Rationale

- **Main page (70% larger)**: The vault is the key visual element and needed more presence
- **Theme modal (2.5x larger)**: The unlock animation is the "hero moment" - needs dramatic size to showcase the full animation glory
- **Center point preservation**: Negative margins are calculated to keep visual center aligned with the D.E.F.I.N.E. boxes despite the larger size

## CSS Implementation

```css
/* Main page vault */
.vault-logo {
  width: clamp(4.5rem, 12vw, 5.5rem);
  height: clamp(4.5rem, 12vw, 5.5rem);
  position: relative;
  z-index: 10;
  margin-right: -0.8rem; /* Adjusted for larger size to maintain center */
}

/* Theme modal vault (large showcase) */
.vault-logo-large {
  width: clamp(7rem, 18vw, 9rem);
  height: clamp(7rem, 18vw, 9rem);
}

/* "lock" text in theme modal */
.vault-lock-text {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 700;
  font-style: italic;
}

/* "Un" text overlay - matches original UnPrefix styling */
.vault-logo .vault-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-primary);
  font-style: italic;
  font-weight: 800;
  font-size: clamp(1.2rem, 3.5vw, 1.5rem); /* Matches UnPrefix normal */
  color: #1a237e; /* Dark blue for closed/orange/red states */
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.85);
  pointer-events: none;
  transition: color 0.3s ease-in-out, text-shadow 0.3s ease-in-out;
}

/* WHITE "Un" text when vault is OPEN (unlocked state) for better legibility */
.vault-logo.open .vault-label {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.4);
}

.vault-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

## "Un" Text Color States

The "Un" text overlay changes color based on the vault state for optimal legibility:

| Vault State | Text Color | Text Shadow | Reason |
|-------------|------------|-------------|--------|
| Closed (default) | `#1a237e` (dark blue) | White glow | Good contrast against closed vault |
| Orange (70-79%) | `#1a237e` (dark blue) | White glow | Good contrast against orange vault |
| Red (<70%) | `#1a237e` (dark blue) | White glow | Good contrast against red vault |
| **Open (80%+)** | `#ffffff` (white) | Dark shadow | **White for legibility** against the dark interior of the open vault |

The color transition is animated with a 0.3s ease-in-out for smooth visual feedback.

## Future Considerations

1. **Reduced Motion**: For `prefers-reduced-motion`, skip to final state immediately
2. **Loading States**: Preload all images on app init to prevent flicker
3. **Error States**: Fallback to text "Un·" if images fail to load
4. **Archive Games**: Consider if vault should animate for archive theme guesses

## Related Documentation

- `docs/THEME_GUESS_COLOR_SYSTEM.md` - Color coding for theme confidence
- `docs/UN_DIAMOND_COLOR_SCHEME.md` - Original diamond color states
- `client/src/components/ThemeGuessModal.tsx` - Theme popup implementation

---

## Changelog

| Date | Change |
|------|--------|
| Jan 2026 | Initial documentation created |
| Jan 2026 | Added image assets to `client/public/` |
| Jan 2026 | Increased main page vault size by 70% (keeping center aligned) |
| Jan 2026 | Added `large` prop for theme modal showcase (2.5x size) |
| Jan 2026 | Made "lock" text in theme modal 2.5-3x larger for animation impact |
| Jan 2026 | Updated PNG images with transparent backgrounds |
| Jan 2026 | Fixed "Un" text size/style to match UnPrefix (smaller, italic, 800 weight) |
| Jan 2026 | Reduced gap between vault and "lock" text (removed interpunct) |
| Jan 2026 | Fixed animation timing: visual changes (colors) now occur AFTER vault animation completes |
| Jan 2026 | **Added Orange/Red vault images for <80% theme scores** |
| Jan 2026 | **Orange shake animation for 70-79% scores (Orange → OrangeLeft → Orange → OrangeRight → Orange)** |
| Jan 2026 | **Red shake animation for <70% scores (Red → RedLeft → Red → RedRight → Red)** |
| Jan 2026 | **"Un" text now WHITE when vault is OPEN (unlocked) for better legibility** |
| Jan 2026 | Added `animateForScore` and `onScoreAnimationComplete` props for score-based animations |
| Jan 2026 | Main page vault now persists Orange.png or Red.png based on highest score |

