# Lesson 3: Lifting State Up / Props Down / Callbacks Up

**Placement note:** This lesson depends on both Lesson 1 (components and props) and Lesson 2 (useState). You need to understand both before you can understand WHY we lift state: two sibling components that both need the same data means neither can own it — it must live in their common parent and flow down as props. Without knowing what props ARE (Lesson 1) and what state IS (Lesson 2), this pattern has nothing to stand on.

---

## 0. Why This Lesson Is Here

You now know that a component can store state with `useState`, and that props flow downward from parent to child. But what happens when two components that are not parent and child both need the same data? What happens when a child needs to change data that lives in a sibling? This lesson answers those questions with the most important architectural pattern in React: lifting state up.

---

## 1. The Thermostat Analogy

Imagine a house with two rooms: a bedroom and a living room. Both rooms have a temperature display. If each room had its own independent thermometer (its own state), you would have two different readings that might disagree. To keep them in sync, you need one thermostat — a shared source of truth that both rooms read from.

The thermostat is the parent component. Both rooms are children. The temperature is state that lives in the parent and flows down to the children as props. If a room wants to change the temperature, it does not have its own thermostat — it calls the parent and asks the parent to make the change.

This is lifting state up: moving state from a child (or from two siblings) into a common parent so it can be shared.

---

## 2. Why It Exists — The Broken Version

Suppose you have two components that both need to show the same value. Naively, each owns its own state:

```jsx
function SpeedDisplay() {
  const [velocity, setVelocity] = useState(0);
  return <p>Speed: {velocity} m/s</p>;
}

function SpeedSlider() {
  const [velocity, setVelocity] = useState(0);
  return <input type="range" onChange={e => setVelocity(Number(e.target.value))} />;
}

function App() {
  return (
    <>
      <SpeedDisplay />  {/* Has its own velocity: always 0 */}
      <SpeedSlider />   {/* Has its own velocity: changes when dragged */}
    </>
  );
}
```

Moving the slider changes `SpeedSlider`'s local velocity, but `SpeedDisplay` has no idea — it has its own separate state that stays at 0. They are out of sync immediately, and there is no way to synchronize them from the outside.

The fix is to lift the velocity state into the parent:

```jsx
function SpeedDisplay({ velocity }) {
  return <p>Speed: {velocity} m/s</p>;
}

function SpeedSlider({ velocity, onVelocityChange }) {
  return (
    <input
      type="range"
      value={velocity}
      onChange={e => onVelocityChange(Number(e.target.value))}
    />
  );
}

function App() {
  const [velocity, setVelocity] = useState(0);

  return (
    <>
      <SpeedDisplay velocity={velocity} />
      <SpeedSlider velocity={velocity} onVelocityChange={setVelocity} />
    </>
  );
}
```

Now there is one velocity. Both children read the same value. When the slider moves, it calls `onVelocityChange`, which is `setVelocity` in the parent. The parent updates its state. Both children re-render with the new value. They can never disagree.

---

## 3. Callbacks Up — How Children Tell Parents About Events

Since props are read-only and data flows downward, how does a child communicate something back to the parent? The answer is callbacks: the parent passes a function as a prop, and the child calls that function when an event happens.

The child does not decide what happens — it just announces that an event occurred and passes along any relevant data. The parent decides how to respond.

A controlled input is the simplest example:

```jsx
function NameInput({ name, onNameChange }) {
  return (
    <input
      value={name}
      onChange={(e) => onNameChange(e.target.value)}
    />
  );
}

function App() {
  const [name, setName] = useState("");

  return <NameInput name={name} onNameChange={setName} />;
}
```

`NameInput` does not own `name`. It receives it as a prop and calls `onNameChange` when the user types. App owns `name` and updates it when `onNameChange` is called. This is the fundamental React pattern for user input.

The naming convention for callbacks is `on` followed by the event name: `onChange`, `onReset`, `onPlay`, `onVelocityChange`. This signals to the reader that this is a function the parent passes down to be called when something happens.

---

## 4. A More Complete Example

Here is a small self-contained example that puts everything together:

```jsx
function TemperatureDisplay({ temperature }) {
  return <p>Current temperature: {temperature}°C</p>;
}

function TemperatureControl({ temperature, onTemperatureChange }) {
  return (
    <div>
      <input
        type="range"
        min={0}
        max={40}
        value={temperature}
        onChange={(e) => onTemperatureChange(Number(e.target.value))}
      />
    </div>
  );
}

function TemperatureApp() {
  const [temperature, setTemperature] = useState(20);

  return (
    <div>
      <TemperatureDisplay temperature={temperature} />
      <TemperatureControl
        temperature={temperature}
        onTemperatureChange={setTemperature}
      />
    </div>
  );
}
```

One truth (`temperature` state in `TemperatureApp`). Two children reading from it. One child writing to it via a callback. They will always agree because there is only one copy.

---

## 5. With It vs. Without It

Without lifting state, two siblings show independent values that can never agree. The display and the slider immediately diverge the moment the slider is moved, and there is no mechanism to bring them back in sync.

With lifting state, both siblings share a single value from their parent. The parent is the single source of truth. Every change goes through the parent, and both siblings always see the same value. This is not just a nice-to-have — it is the only correct approach for shared data in React.

---

## 6. Common Mistakes

**Trying to "reach up" to parent state directly.** You cannot call `setVelocity` from a child unless the parent passed it down as a prop. The child has no access to variables declared in the parent's function scope. React does not have a global shared state by default — you must explicitly wire things together with props and callbacks.

**Forgetting to pass the callback function down.** The child calls `onVelocityChange`, but you get a "is not a function" error because you forgot to include `onVelocityChange={setVelocity}` in the JSX. Always check that every callback the child expects is provided by the parent.

**Calling setState inside the child instead of calling the provided callback.** If the child has its own copy of the state setter, it will update its own state independently, not the shared parent state. The rule is: callbacks travel down, events travel up.

---

## 7. Practice Exercise

Build a `ColorPicker` app. The parent component holds `color` state (a string like `"red"`). One child component, `ColorDisplay`, shows a colored box using the current color. Another child component, `ColorButtons`, has three buttons: Red, Blue, Green. Each button calls an `onColorChange` callback.

```jsx
function ColorDisplay({ color }) {
  return (
    <div style={{ width: 100, height: 100, backgroundColor: color }} />
  );
}

function ColorButtons({ onColorChange }) {
  return (
    <div>
      <button onClick={() => onColorChange("red")}>Red</button>
      <button onClick={() => onColorChange("blue")}>Blue</button>
      <button onClick={() => onColorChange("green")}>Green</button>
    </div>
  );
}

function ColorPicker() {
  const [color, setColor] = useState("red");
  return (
    <div>
      <ColorDisplay color={color} />
      <ColorButtons onColorChange={setColor} />
    </div>
  );
}
```

After building this, notice that `ColorDisplay` has no state. `ColorButtons` has no state. Neither of them knows about the other. Their parent, `ColorPicker`, owns everything and coordinates between them. This is the same pattern used throughout this simulation project.

---

## 8. In This Project

`App.jsx` is the single source of truth for the entire simulation. ALL state lives there. Every child component is purely presentational — it receives data as props and fires callbacks when the user does something.

Here is what each component receives:

`Controls.jsx` receives:
- `simulation` — the current `{position, velocity, acceleration, time}` object, shown in the input boxes
- `playing` — whether the simulation is currently running, used to show the right button icon
- `data` — contains `selectedMode` and `recordedData.length`, used for the mode radio buttons and the Clear button's disabled state
- `onSimulationChange` — called when the user changes position, velocity, or acceleration via an input or slider
- `onModeChange` — called when the user switches between Record and Playback modes
- `onTogglePlayPause` — called when the user clicks the play/pause button
- `onReset` — called when the user clicks Reset All
- `onClearRecordedData` — called when the user clicks Clear

`Charts.jsx` receives:
- `data` — contains `recordedData` (the array of snapshots to graph) and `selectedMode`
- `simulation` — the current simulation state, used to draw the time marker line
- `onSetPlaybackTime` — called when the user drags on a chart to scrub through playback

`Simulation3D.jsx` receives:
- `position` — a single number (meters). It renders the sprite at that x-position. No state, no callbacks.

Every single callback in this list is defined in `App.jsx` and passed down. Every single data prop originates from one of App's three `useState` values. There is one source of truth for everything. Lifting state all the way to the top of the tree is a deliberate architectural choice — it makes the data flow easy to trace and eliminates entire categories of sync bugs.
