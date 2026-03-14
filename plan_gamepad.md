# Plan: Gamepad Support for Localify

## Overview
Add gamepad (PS4/Xbox) support for navigating the Localify music player app. Users can browse profiles, navigate the library, and control playback using a controller.

## Implementation

### 1. Create Gamepad Hook (`useGamepad.js`)
- Detect gamepad connections via `navigator.getGamepads()`
- Listen to `gamepadconnected` and `gamepaddisconnected` events
- Poll gamepad state in a `requestAnimationFrame` loop
- Map controller buttons to actions

### 2. Button Mappings
| Action | PS4 | Xbox | Notes |
|--------|-----|------|-------|
| Select/Play | Cross (A) | A | Activate focused element |
| Back | Circle (B) | B | Go back / close modals |
| Navigate Up | D-Pad Up | D-Pad Up | Move focus up |
| Navigate Down | D-Pad Down | D-Pad Down | Move focus down |
| Navigate Left | D-Pad Left | D-Pad Left | Previous item |
| Navigate Right | D-Pad Right | D-Pad Right | Next item |
| Play/Pause | Square (X) | X | Toggle playback |
| Next Track | R1 | RB | Skip to next |
| Previous Track | L1 | LB | Skip to previous |
| Volume Up | R2 | RT | Increase volume |
| Volume Down | L2 | LT | Decrease volume |

### 3. Focus Management
- Track `focusedIndex` state for each navigable list
- Views needing focus: profile carousel, track lists, playlist grid, sidebar nav
- Use `scrollIntoView` to keep focused element visible

### 4. State Management
- Add `focusedIndex` and `focusedCategory` to track navigation position
- Add `gamepadConnected` state to show indicator

## Files to Modify
- `frontend/src/App.jsx` - Add gamepad hook integration, focus state, keyboard handler updates

## Verification
1. Connect a PS4 or Xbox controller
2. Navigate through profiles using D-pad
3. Press A/Cross to select profile and enter app
4. Navigate library, playlists, and control playback with controller
