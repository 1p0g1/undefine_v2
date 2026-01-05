# Vault Logo Animation System

**Created: January 2026**

## Overview

The Vault Logo replaces the original "Un" diamond shape with a series of PNG images that animate based on the player's theme guess status. This creates a visual metaphor of "unlocking" the weekly theme.

## Image Assets

All images are located in `client/public/` and are designed to be **exactly the same size and placement** so they can be swapped seamlessly without repositioning.

| Image | Filename | Purpose |
|-------|----------|---------|
| 🔒 Closed Vault | `ClosedVault.png` | Default state before theme is guessed |
| ✨ Shine Key | `ShineKeyVault.png` | Transition frame showing key insertion/shine effect |
| 🚪 Ajar Vault | `AjarVault.png` | Door beginning to open |
| 🚪 Ajar Vault 2 | `AjarVault2.png` | Door further open |
| 🔓 Open Vault | `OpenVault.png` | Final state after theme is correctly guessed |

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

### Main Page States

| State | Image Shown | Condition |
|-------|-------------|-----------|
| **Pre-Guess** | `ClosedVault.png` | Theme not guessed yet |
| **Post-Guess (Correct)** | `OpenVault.png` | Theme guessed correctly |
| **Post-Guess (Incorrect)** | `ClosedVault.png` | Theme guessed but wrong (still locked) |

### Theme Popup Animation Sequence

When a player submits a **successful** theme guess, the following animation plays inside the theme popup modal:

| Step | Duration | Image | Purpose |
|------|----------|-------|---------|
| 1 | 300ms | `ClosedVault.png` | Starting state |
| 2 | 400ms | `ShineKeyVault.png` | Key glows/shines |
| 3 | 200ms | `ClosedVault.png` | Return to closed (highlights shine effect) |
| 4 | 350ms | `AjarVault.png` | Door begins to open |
| 5 | 350ms | `AjarVault2.png` | Door continues opening |
| 6 | Hold | `OpenVault.png` | Final open state |

**Total Animation Duration:** ~1.6 seconds

### Animation Pseudocode

```typescript
const VAULT_UNLOCK_SEQUENCE = [
  { image: 'ClosedVault.png', duration: 300 },
  { image: 'ShineKeyVault.png', duration: 400 },
  { image: 'ClosedVault.png', duration: 200 },
  { image: 'AjarVault.png', duration: 350 },
  { image: 'AjarVault2.png', duration: 350 },
  { image: 'OpenVault.png', duration: 0 } // Final state, holds
];

// Play animation on correct theme guess
async function playVaultUnlockAnimation() {
  for (const frame of VAULT_UNLOCK_SEQUENCE) {
    setCurrentImage(frame.image);
    if (frame.duration > 0) {
      await delay(frame.duration);
    }
  }
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

## CSS Considerations

```css
.vault-logo {
  /* Same size as original diamond */
  width: clamp(2.8rem, 7.5vw, 3.2rem);
  height: clamp(2.8rem, 7.5vw, 3.2rem);
  
  /* OVERLAP the D box (higher z-index) */
  position: relative;
  z-index: 5;
  margin-right: -0.3rem; /* Slight overlap into DEFINE boxes */
  
  /* Smooth image transitions */
  transition: opacity 0.1s ease-in-out;
}

.vault-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

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

