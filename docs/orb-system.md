# ✨ Interactive Orb & Transition System

## Overview

The Interactive Orb is the unique unlock mechanism for Finish By. It serves as both a security pattern (like Android's pattern lock) and a visual transition that bridges authentication into the app's core reading dashboard.

## Architecture

### Core Concept: "Order from Chaos"

```
Idle Orb (Static) 
    ↓ [Tap Pattern]
Orb Unravels (Threads emerge)
    ↓ [Pattern Complete]
Threads Transform Into:
    - Progress Bars
    - Reading Streaks  
    - Daily Targets
```

## The Orb System

### 1. **Static Visual State**

The orb exists in several states:

| State | Description | Visual |
|-------|-------------|--------|
| `idle` | Waiting for input | Smooth breathing animation, blue glow |
| `locked` | User has started pattern | Enlarged, increased glow, thread emergence |
| `success` | Pattern complete | Green, particles burst, threads fully extended |
| `error` | Wrong tap/timing | Red flash, reset sequence |

### 2. **Pattern Recognition System**

The pattern is a 3-step tap sequence with spatial and temporal components:

```javascript
const PATTERN = [
  { zone: 'top', time: 500 },      // First tap: top zone
  { zone: 'right', time: 300 },    // Second tap: right, within 300ms
  { zone: 'bottom', time: 500 },   // Third tap: bottom, within 500ms
];
```

**Zone Detection**
- Orb is divided into 4 zones: top, right, bottom, left
- Based on click angle from center
- Tolerance: ±30px from expected tap location

**Timing Validation**
- Each tap must occur within ±200ms of expected timing
- Creates rhythm that users learn (1–2 seconds total)
- Prevents accidental double-taps

### 3. **Secure Storage**

Pattern is stored securely in IndexedDB:

```javascript
// Store
await window.storage.set('tap-pattern', JSON.stringify(tapSequence));

// Verify on app load
const storedPattern = await window.storage.get('tap-pattern');
if (storedPattern && userPattern === storedPattern) {
  // Grant access to dashboard
}
```

## Daily Use Flow

```
1. Open app
2. Orb appears on screen
3. Tap the pattern (1–2 seconds)
   - Visual feedback for each correct tap
   - Zone indicators light up
4. Pattern completes
   - Orb unravels into threads
   - Threads transform into dashboard UI
5. Instant access to:
   - Book list
   - Progress bars
   - Reading stats
```

## MVP Implementation

### ✅ Completed Features

1. **Static Orb Rendering**
   - Canvas-based SVG-like rendering
   - Smooth animations
   - Breathing effect
   - Glow that changes by state

2. **Tap Sequence Detection**
   - Zone detection based on click coordinates
   - 4-directional zones (top, right, bottom, left)
   - Visual zone indicators

3. **Success/Failure Animation**
   - Particle burst on correct taps
   - Color change feedback
   - State transitions

4. **Local Secure Storage**
   - Pattern stored in IndexedDB
   - Persists across sessions
   - One pattern per user

5. **Instruction Display**
   - Current step counter
   - Zone highlighting
   - Real-time feedback

### 🚀 Future Enhancements

#### Emotional UI (Adaptive Orb)
```javascript
// Orb evolves based on reading behavior
if (user.missedDays > 3) {
  orbVisuals.density = 'tight';      // Denser appearance
  orbVisuals.animation = 'slower';   // Heavier feel
} else {
  orbVisuals.density = 'open';       // More space
  orbVisuals.animation = 'lighter';  // Responsive, snappy
}
```

**Visual States Based on Progress**
- Behind on reading: Heavier, slower, slightly closed
- On track: Light, responsive, open
- Ahead of schedule: Extra glow, faster animation

#### Haptic Feedback
```javascript
// Haptic patterns for feedback
const hapticPatterns = {
  correctTap: 'light',      // Subtle vibration
  wrongTap: 'warning',      // Stronger double-pulse
  patternComplete: 'success', // Satisfying long buzz
};

// Trigger on user interaction
if (isCorrectTap) {
  navigator.vibrate(hapticPatterns.correctTap);
}
```

**Haptic Sequences**
- Correct tap → Light 20ms vibration
- Wrong tap → 50ms + 50ms pause + 50ms (warning pattern)
- Pattern complete → 200ms long buzz (release satisfaction)

#### Thread Animation to UI
```javascript
// SVG threads animate from orb position to UI elements
const threads = [
  { from: orbCenter, to: progressBarsPosition, color: 'blue' },
  { from: orbCenter, to: streakCounterPosition, color: 'green' },
  { from: orbCenter, to: targetPosition, color: 'purple' },
];

threads.forEach(thread => {
  animateThread(thread, {
    duration: 1200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  });
});
```

## Technical Details

### Canvas Rendering
- Requestanimationframe for 60fps animations
- Radial gradients for orb depth
- Particle system for burst effects
- Thread drawing using Bezier curves (future)

### State Management
```javascript
const [orbState, setOrbState] = useState('idle');     // Current visual state
const [tapSequence, setTapSequence] = useState([]);   // User's taps so far
const [particles, setParticles] = useState([]);       // Active particles
```

### Event Handling
```javascript
// Click detection with zone mapping
const zone = getZoneFromClick(x, y, centerX, centerY, radius);

// Validation against pattern
const isValid = validateTap(zone);

// State transition on complete/error
if (tapSequence.length === PATTERN.length) {
  setOrbState('success');
}
```

## Testing

### Unit Tests Coverage

1. **Zone Detection**
   ```javascript
   ✓ Detects right zone (angle 0°)
   ✓ Detects bottom zone (angle 90°)
   ✓ Detects left zone (angle 180°)
   ✓ Detects top zone (angle 270°)
   ✓ Rejects clicks outside radius
   ```

2. **Pattern Validation**
   ```javascript
   ✓ Accepts correct zone sequence
   ✓ Rejects wrong zone
   ✓ Rejects incorrect timing (>200ms tolerance)
   ✓ Resets sequence on error
   ```

3. **State Transitions**
   ```javascript
   ✓ idle → locked on first tap
   ✓ locked → success on complete pattern
   ✓ any state → error on invalid tap
   ✓ error → idle after 600ms
   ```

### Running Tests
```bash
npm run test                # Run all tests
npm run test:ui             # Open test UI dashboard
npm run test -- --watch     # Watch mode
```

## Security Considerations

1. **Pattern Complexity**
   - 3-step sequence = 4³ = 64 possible patterns
   - With timing window = 1024+ effective combinations

2. **Storage**
   - Stored in IndexedDB (sandboxed per origin)
   - Not accessible from other tabs
   - Encrypted if using encrypted storage API

3. **Rate Limiting** (Future)
   - Max 5 attempts per minute
   - Exponential backoff after failures
   - Clear pattern after 10 failed attempts

## Performance Optimization

- **Canvas Resizing**: Debounced on window resize
- **Animation**: RequestAnimationFrame (60fps)
- **Particle Count**: Limited to 24 active particles
- **Memory**: Particles cleaned up automatically when life < 0

## Accessibility

- Keyboard fallback (numeric pad input for testing)
- Voice guidance (future: "Tap top, then right, then bottom")
- High contrast mode support
- Screen reader announcements for tap feedback

## Integration with Dashboard

```javascript
// In App.jsx
const [isUnlocked, setIsUnlocked] = useState(false);

if (!isUnlocked) {
  return <InteractiveOrb onPatternComplete={() => setIsUnlocked(true)} />;
}

return <DashboardView books={books} />;
```

## Example Usage

```jsx
import InteractiveOrb from './InteractiveOrb';

function App() {
  const handlePatternComplete = (sequence) => {
    console.log('Pattern completed:', sequence);
    // Grant dashboard access
    navigateToDashboard();
  };

  return (
    <InteractiveOrb 
      onPatternComplete={handlePatternComplete}
      onStateChange={(state) => console.log('Orb state:', state)}
    />
  );
}
```

## Debugging

Enable debug mode to visualize:
- Zone boundaries (colored circles)
- Tap coordinates
- Timing windows
- State transitions

```javascript
const DEBUG = true; // Set in InteractiveOrb.jsx

if (DEBUG) {
  console.log('Zone detected:', zone);
  console.log('Current state:', orbState);
  console.log('Tap sequence:', tapSequence);
}
```

---

**Version:** 1.0.0  
**Last Updated:** March 2026  
**Status:** MVP Complete ✓
