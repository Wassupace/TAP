# Task 10: Real FT marker on the shot chart

## Status
**DONE**

## Summary
Fixed the free-throw marker in `src/components/ui/ShotChart.tsx` to display real player shooting data instead of hardcoded values.

## Changes Made

### 1. Updated ShotChartProps interface
Added two new optional numeric props to `ShotChartProps`:
- `ftMakes?: number` (defaults to 0)
- `ftAttempts?: number` (defaults to 0)

### 2. Updated ShotChart component
- Modified function signature to destructure the new props with default values (0, 0)
- Updated the `zoneColor()` call on line 192 to use `ftMakes` and `ftAttempts` instead of hardcoded `41` and `50`
- Updated the FT marker label rendering (lines 284-285):
  - Makes/attempts label: displays `${ftMakes}/${ftAttempts}` when ftAttempts > 0, falls back to 'FT' when ftAttempts === 0
  - Percentage label: displays `${Math.round((ftMakes / ftAttempts) * 100)}%` when ftAttempts > 0, falls back to '—' when ftAttempts === 0

### 3. Updated PlayerProfilePage
Passed real values from the `shooting` object to the `<ShotChart/>` component:
- `ftMakes={shooting?.ftMakes ?? 0}`
- `ftAttempts={shooting?.ftAttempts ?? 0}`

## Testing
- ✅ Full test suite: 19 test files, 168 tests all passing (run twice)
- ✅ Build: Clean build with no new errors (`npm run build`)
- ✅ Lint: No new linting issues introduced (5 pre-existing errors + 1 warning in baseline files as expected)

## Technical Details
- The `usePlayerShooting` hook in `PlayerProfilePage.tsx` already computes `ftMakes` and `ftAttempts` from the player's historical shooting data
- The FT marker now correctly reflects the player's actual free-throw statistics
- Fallback behavior preserves UX when no shooting data exists (ftAttempts === 0)
- No styling changes needed; existing CSS custom properties handle the color logic via `zoneColor()` function

## Files Modified
- `src/components/ui/ShotChart.tsx`: Added props, updated FT marker rendering logic
- `src/pages/PlayerProfilePage.tsx`: Passed real FT stats to ShotChart

## Notes
- No other zone rendering logic was modified
- No new npm dependencies added
- All existing tests continue to pass
- Component remains backward-compatible (props default to 0, 0)
