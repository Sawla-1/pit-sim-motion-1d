# Data Flow

## Overview

Data flows in one direction: `App` owns all state, passes it down as props, and receives changes back through named callbacks. The animation loop runs inside a custom hook that writes back to `App` state via the `setSimulation` and `setData` setters.

## Prop and callback map

```
App
├── useSimulationLoop({ playing, time, simulation, data, setSimulation, setData })
│     └── calls setSimulation / setData each tick
│
├── Simulation3D
│     props:  position={simulation.position}
│
├── Charts
│     props:  data={data}
│             simulation={simulation}
│     calls:  onSetPlaybackTime(newTime)  →  App.handleSetPlaybackTime
│
└── Controls
      props:  simulation={simulation}
              data={data}
      calls:  onSimulationChange(changes)  →  App.handleSimulationChange
              onModeChange(mode)           →  App.switchMode
              onTogglePlayPause()          →  App.togglePlayPause
              onReset()                    →  App.reset
              onClearRecordedData()        →  App.clearRecordedData
```

## Per-tick data flow (record mode)

```
RAF fires
  → useSimulationLoop reads simulationRef.current, dataRef.current
  → handleRecordingStep(sim, Δt, realElapsedTime)
      → calculatePhysicsStep  →  new simulation snapshot
      → builds recordedState object
  → setSimulation(newSimulation)          updates simulation state
  → setData(prev => { recordedData: [...prev.recordedData, newState] })
  → React re-renders:
      Simulation3D receives new position
      Charts receives new recordedData (longer array) and simulation.time
```

## Per-tick data flow (playback mode)

```
RAF fires
  → useSimulationLoop reads dataRef.current
  → handlePlaybackStep(dat, Δt)
      → advances playbackTime by Δt
      → findClosestState(recordedData, newTime)  →  historical snapshot
      → returns { simulation, data }
  → setSimulation(historicalSnapshot)     overwrites live simulation
  → setData(prev => { ...prev, playbackTime: newTime })
  → React re-renders:
      Simulation3D sprite jumps to historical position
      Charts annotation line moves to simulation.time
```

## Chart scrub flow

```
User drags on a chart canvas
  → Charts.handleMouseMove
  → computes timeValue from mouse X / canvas width * maxTime
  → calls onSetPlaybackTime(clampedTime)
  → App.handleSetPlaybackTime
      → setData({ playbackTime: newTime })
      → find snapshot within 16 ms of newTime
      → setSimulation(snapshot)
  → Simulation3D sprite jumps, annotation line moves
```
