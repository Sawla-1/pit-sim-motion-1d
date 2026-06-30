# Playback System

## Mode vs. play state

Two independent booleans control behavior:

| Field | What it means |
|---|---|
| `data.selectedMode` | `'record'` or `'playback'` — user's radio button choice |
| `data.isPlayback` | Whether the loop is actively replaying recorded data right now |
| `simulation.playing` | Whether the RAF loop is advancing at all |

`selectedMode === 'playback'` and `isPlayback === false` means the user is in playback mode but currently paused. The loop still runs RAF but skips the accumulator body because `playing` is false.

## Loop branching

Inside `useSimulationLoop`, each physics tick branches on both flags:

```js
if (dat.isPlayback && dat.selectedMode === "playback") {
  // PLAYBACK
} else {
  // RECORDING
}
```

## Recording

`handleRecordingStep` (in `src/engine/playback.js`) calls `calculatePhysicsStep` and packages the result into a `recordedState` object. The hook appends it to `data.recordedData`:

```js
setData(prev => ({
  ...prev,
  recordedData: [...prev.recordedData, result.recordedState],
}));
```

## Playback

`handlePlaybackStep` advances `playbackTime` by one `FIXED_TIMESTEP`, then calls `findClosestState` to find the nearest snapshot:

```js
export function findClosestState(recordedData, targetTime) {
  let closest = recordedData[0];
  for (let i = 0; i < recordedData.length; i++) {
    if (Math.abs(state.time - targetTime) < Math.abs(closest.time - targetTime)) {
      closest = state;
    }
  }
  return closest;
}
```

This is a linear scan — O(n) per tick. For typical recordings (a few hundred snapshots) this is negligible.

## End of playback

When `playbackTime + Δt >= maxTime`, the function returns the last recorded snapshot and sets `playing: false` and `isPlayback: false`:

```js
return {
  simulation: { ...lastState, playing: false },
  data: { playbackTime: lastState.time, isPlayback: false },
  isEndOfPlayback: true,
};
```

The sprite stops at the final position and the play button returns to its play state.

## Switching modes

### Record → Playback
`App.switchMode('playback')` resets `playbackTime` to 0 and sets `simulation` to the first recorded snapshot. The user must press Play again to start replay.

### Playback → Record
`App.switchMode('record')` sets `simulation` to the last recorded snapshot, allowing the user to extend the recording from where it left off.
