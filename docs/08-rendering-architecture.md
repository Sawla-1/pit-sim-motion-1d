# Rendering Architecture

## Simulation3D

`src/components/Simulation3D.jsx` is a pure renderer. It receives one prop (`position: number`) and has no internal state. Its only job is to place a sprite at the given coordinate.

### Canvas setup

```jsx
<Canvas
  orthographic
  camera={{ position: [0, 0, 10], zoom: 60 }}
  className="w-full h-[125px] bg-blue-50 rounded-lg"
>
```

Orthographic projection is used (not perspective) so the sprite's apparent size does not change as it moves along the x-axis. `zoom: 60` maps 1 Three.js unit to 60 CSS pixels at the baseline.

### Coordinate system

Three.js world units map directly to simulation meters. A position of `5.0` (meters) places the sprite at `x = 5` in world space, which lands 5 × 60 = 300 px to the right of center on the canvas.

### Ruler

The ruler is built from 21 `<sprite>` elements spaced 1 unit apart from −10 to +10:

```jsx
Array.from({ length: 21 }, (_, i) => i - 10).map((i) =>
  i % 2 === 0
    ? <sprite scale={[0.02, 0.3, 1]} />   // major tick (even meters)
    : <sprite scale={[0.02, 0.15, 1]} />  // minor tick (odd meters)
)
```

The center tick (0 m) is rendered separately in red. Tick marks use `spriteMaterial`, which always faces the camera — correct for an orthographic 2D scene.

### HTML label overlay

Numeric labels (−10, −8, … 10) are absolutely-positioned HTML `<div>` elements on top of the canvas. These are not Three.js objects because Three.js text rendering in R3F requires either a texture atlas or `<Text>` from `@react-three/drei`, adding complexity. Fixed percentage positions in CSS approximate the world-space positions for this fixed-range ruler.

### Moving sprite

```jsx
<sprite position={[position, 0, 0]} scale={[0.8, 1.2, 1]}>
  <spriteMaterial color="orange" />
</sprite>
```

R3F updates the `position` prop reactively — no imperative Three.js calls needed. React reconciles the new position and Three.js moves the sprite on the next render frame.

## Charts

`src/components/Charts.jsx` uses `react-chartjs-2` (a React wrapper around Chart.js) with three `<Line>` components. Each chart:

- Reads directly from `data.recordedData` and `simulation` (no derived state)
- Has `animation: false` to prevent interpolation delays during real-time updates
- Uses `maintainAspectRatio: false` so the container CSS controls height

Chart.js plugin registrations are done once at module level via `ChartJS.register(...)`.
