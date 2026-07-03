# Lesson 9: React Three Fiber Basics

**Placement note:** R3F comes after the core React concepts (Lessons 1–5) and after the animation loop lessons (Lessons 7–8) because R3F is "React plus Three.js" — you need to understand React first. It is placed after the animation loop lessons because understanding that `useSimulationLoop` runs its own RAF loop (not R3F's built-in `useFrame`) requires knowing why you would deliberately bypass R3F's loop. Without Lesson 7, the distinction would be meaningless.

---

## 0. Why This Lesson Is Here

The 3D ruler and moving sprite in this project are rendered using React Three Fiber (R3F). You need to understand enough R3F to read `Simulation3D.jsx` — specifically what `<Canvas>`, `<mesh>`, `<sprite>`, and `orthographic` mean. This lesson gives you exactly that knowledge, no more.

---

## 1. What Is React Three Fiber?

Three.js is a powerful JavaScript library for rendering 3D graphics in a browser using WebGL. It is fully capable and widely used, but its API is imperative: you write code like "create a geometry, create a material, create a mesh, add the mesh to the scene, update the mesh position when something changes." It is verbose, and it puts the burden on you to keep the Three.js scene in sync with your application state.

React Three Fiber (R3F) is a bridge between Three.js and React. It lets you write Three.js scenes using React components and JSX — the same syntax you already know. Instead of:

```js
// Three.js imperative style
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: "orange" });
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(5, 0, 0);
scene.add(mesh);
```

You write:

```jsx
// R3F declarative style
<mesh position={[5, 0, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="orange" />
</mesh>
```

The second form is shorter, more readable, and reactive — when `position` changes, the mesh moves. R3F handles the Three.js calls internally.

---

## 2. The Canvas

The entry point for any R3F scene is `<Canvas>`. Everything inside `<Canvas>` is part of the 3D scene. Things outside it are regular HTML.

```jsx
import { Canvas } from "@react-three/fiber";

function MyScene() {
  return (
    <div style={{ width: 800, height: 400 }}>
      <Canvas>
        {/* 3D objects go here */}
        <ambientLight intensity={1} />
        <mesh position={[0, 0, 0]}>
          <boxGeometry />
          <meshStandardMaterial color="red" />
        </mesh>
      </Canvas>
    </div>
  );
}
```

`Canvas` creates a WebGL rendering context and sets up a Three.js scene. The wrapper `<div>` controls the size. Everything inside `<Canvas>` is in 3D space.

---

## 3. Meshes

A mesh is the fundamental 3D object: a shape combined with a surface appearance. In R3F, you declare it with nested JSX:

```jsx
<mesh position={[x, y, z]}>
  <boxGeometry args={[width, height, depth]} />
  <meshStandardMaterial color="blue" />
</mesh>
```

- `<mesh>` is the container. Its `position` prop sets the x, y, z coordinates.
- `<boxGeometry>` defines the shape. `args` is the constructor arguments: width, height, depth.
- `<meshStandardMaterial>` defines the surface. `color` sets the color.

Other common geometries: `<planeGeometry>` (a flat rectangle), `<sphereGeometry>`, `<cylinderGeometry>`. Other materials: `<meshBasicMaterial>` (no lighting effects, always the same brightness), `<meshStandardMaterial>` (responds to lights in the scene).

---

## 4. Sprites

A sprite is a flat image or colored rectangle that always faces the camera, no matter how the camera is oriented. In a 2D-style simulation like this one, sprites are used for simple moving objects because they never appear rotated or foreshortened.

```jsx
<sprite position={[x, 0, 0]} scale={[0.8, 1.2, 1]}>
  <spriteMaterial color="orange" />
</sprite>
```

`scale` controls the width and height of the sprite in scene units. `spriteMaterial` is the simplest material for sprites.

---

## 5. Reactive Props — The Core Benefit

In R3F, props are reactive. If you pass `position={[x, 0, 0]}` and `x` comes from React state or props, the 3D object moves when `x` changes — automatically, with no extra code. This is the React mental model applied to 3D.

```jsx
function MovingBox({ x }) {
  return (
    <mesh position={[x, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}
```

When the parent updates `x` (via state or a prop), `MovingBox` re-renders with the new `x`, and R3F moves the mesh to the new position. You write zero Three.js update code. The position stays in sync with your data automatically.

---

## 6. OrthographicCamera vs. PerspectiveCamera

A perspective camera shows the world as the human eye sees it: objects farther away look smaller, parallel lines converge at the horizon. This is the default camera for most 3D scenes.

An orthographic camera has no perspective. Objects at any distance appear the same size. Parallel lines stay parallel. This is useful for:
- 2D-style games and simulations
- Engineering/CAD views where you need accurate measurements
- Side-scrolling scenes where depth distortion would be wrong

In this project, the `<Canvas>` uses `orthographic` mode:

```jsx
<Canvas
  orthographic
  camera={{ position: [0, 0, 10], zoom: 60 }}
>
```

The `zoom: 60` means 1 unit in 3D space corresponds to 60 pixels on screen. So a sprite at `position={[1, 0, 0]}` (1 meter in physics units) appears 60 pixels to the right of center. A sprite at `position={[5, 0, 0]}` appears 300 pixels to the right. The `position` prop from the physics simulation maps directly to scene units — no conversion needed.

---

## 7. With It vs. Without It

Moving an object in raw Three.js requires keeping a reference to the mesh object and imperatively updating it:

```js
// Raw Three.js — imperative
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Later, when physics updates:
mesh.position.x = newPhysicsPosition;
```

You must manually wire up every state change to a Three.js mutation. If you have multiple objects, multiple properties, or complex conditional logic, this becomes a tangle of imperative update calls.

With R3F, you just pass the position as a prop:

```jsx
// R3F — declarative
<sprite position={[physicsPosition, 0, 0]} scale={[0.8, 1.2, 1]}>
  <spriteMaterial color="orange" />
</sprite>
```

When `physicsPosition` changes (because App's `simulation.position` changed), React re-renders `Simulation3D`, and R3F updates the sprite's position automatically. No imperative update code. No references to manage. The data drives the 3D scene.

---

## 8. Common Mistakes

**Trying to use HTML elements inside Canvas.** You cannot put `<div>`, `<p>`, or other HTML inside `<Canvas>`. Everything inside the Canvas is in WebGL 3D space, not the HTML DOM. If you need HTML text overlaid on the 3D scene (like ruler labels), put it OUTSIDE the `<Canvas>` with CSS positioning. This project does exactly that — the ruler number labels (`-10`, `-8`, `0 meters`, etc.) are regular `<div>` elements positioned absolutely over the canvas with `pointer-events-none` so they do not intercept mouse events.

**Forgetting that position is `[x, y, z]` not just `x`.** R3F uses Three.js coordinates, which are always 3D vectors. Even for a 1D simulation you must provide all three components: `position={[physicsPosition, 0, 0]}`.

**Mixing R3F's `useFrame` with an external RAF loop.** R3F provides a hook called `useFrame` that runs a callback once per frame inside the canvas's own render loop. This project deliberately does NOT use `useFrame`. Instead, the physics runs in its own RAF loop (`useSimulationLoop`) and pushes updated state back to React, which then flows down to `Simulation3D` as props. This keeps physics separate from rendering — the physics engine does not know about Three.js, and the 3D renderer does not know about physics. If you tried to use both loops simultaneously, you would have two competing animation systems with no clear ownership.

---

## 9. In This Project

`src/components/Simulation3D.jsx` uses R3F to render the ruler and the moving sprite. Here is what each piece does:

```jsx
<Canvas
  orthographic
  camera={{ position: [0, 0, 10], zoom: 60 }}
  className="w-full h-[125px] bg-blue-50 rounded-lg"
>
  <ambientLight intensity={1} />

  <group>
    {/* Ruler base line */}
    <mesh position={[0, -0.6, 0]}>
      <planeGeometry args={[50, 0.1]} />
      <meshBasicMaterial color="skyblue" />
    </mesh>

    {/* Ruler tick marks */}
    {Array.from({ length: 21 }, (_, i) => i - 10).map((i) => (
      <sprite key={`marker-${i}`} position={[i, -0.7, 0]} scale={[0.02, 0.3, 1]}>
        <spriteMaterial color="#2d5016" />
      </sprite>
    ))}

    {/* Center marker (0 meters) */}
    <sprite position={[0, -0.7, 0]} scale={[0.03, 0.3, 1]}>
      <spriteMaterial color="#ff4444" />
    </sprite>
  </group>

  {/* The moving ball */}
  <sprite position={[position, 0, 0]} scale={[0.8, 1.2, 1]}>
    <spriteMaterial color="orange" />
  </sprite>
</Canvas>
```

The `position` prop passed to the orange sprite is directly the physics position in meters. At `zoom: 60`, each meter corresponds to 60 pixels — so a position of 5.0 meters places the sprite 300 pixels to the right of center. The ruler ticks are placed at positions -10 through 10 in scene units, which correspond exactly to -10 through 10 meters.

`Simulation3D` has NO internal state, NO animation loop, NO side effects. It is a pure renderer. It receives a position number and renders the scene at that position. Every render produces the correct scene for the given position. This is the React model applied cleanly to 3D graphics.
