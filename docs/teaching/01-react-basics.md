# Lesson 1: React Fundamentals

**Placement note:** This is the first deep lesson because everything else depends on it. You cannot understand useState, useRef, or useEffect without first understanding what a React component IS, what props ARE, and what JSX IS. This is the foundation all other lessons build on.

---

## 0. Why This Lesson Is Here

Before you can learn how this app manages state, runs an animation loop, or renders 3D graphics, you need to know what React is at its core. Every other lesson in this curriculum uses words like "component," "props," "JSX," and "re-render." If those words are fuzzy, every later lesson will also be fuzzy. Get them clear now and everything else clicks into place.

---

## 1. What Is React?

Before React existed, web developers built dynamic pages by directly manipulating the browser's DOM — the internal tree of elements that makes up a webpage. If you wanted to update a list when the user clicked a button, you wrote code like: "find the list element, clear its contents, loop through the data, create new elements, append them." That worked, but it got complicated fast. The code for "what the page looks like" and "how to update it when data changes" got tangled together.

React is a JavaScript library that separates those concerns. You describe what the page should look like for any given state of the data. React figures out the minimum changes needed to make the real browser DOM match your description whenever the data changes. You stop thinking about "how to update" and start thinking only about "what it should look like."

The building block of React is the **component**. A component is a JavaScript function that returns a description of some piece of the UI. Every file in `src/components/` is a component. The entire app is built by composing components together.

---

## 2. The House Analogy

Think of the app as a house. The house itself is `App.jsx`. Inside the house, there are rooms: the 3D view room (`Simulation3D`), the charts room (`Charts`), and the controls room (`Controls`). Each room has a specific purpose and its own layout.

**Props** are information passed through the door. If the controls room needs to know the current velocity so it can display it in a text box, App passes that value through the door as a prop. The room reads the value but cannot reach back through the door and change the thermostat in the hallway — it can only receive what it is given.

**JSX** is the syntax for describing what a component looks like. It looks like HTML mixed with JavaScript, but it is actually JavaScript under the hood. When you write `<Controls simulation={simulation} />`, you are calling the `Controls` function and passing it an object called `simulation` as an argument.

---

## 3. Why React Exists

Here is the problem React solves. Suppose you have a counter that shows a number, and a button that increments it. Without React, you would write something like this:

```html
<!-- HTML -->
<p id="counter">0</p>
<button onclick="increment()">Add 1</button>
```

```js
// JavaScript — manually updating the DOM
let count = 0;
function increment() {
  count++;
  document.getElementById("counter").innerHTML = count;
}
```

This works fine for one counter. But now imagine you have fifty UI elements that all depend on the same piece of data, and that data can change from many different places. You have to remember to update every one of those elements every time the data changes. If you forget one, the page shows stale information. The code becomes a tangled web of `getElementById` calls and manual DOM mutations.

React's solution: you declare what the UI should look like as a function of the data. React watches the data and calls your function again whenever it changes. Every element stays in sync automatically.

---

## 4. A Minimal Component

Here is the simplest React component you can write:

```jsx
function Greeting({ name }) {
  return <p>Hello, {name}!</p>;
}
```

You use it like this:

```jsx
<Greeting name="Alice" />
```

The browser sees: `Hello, Alice!`

Notice a few things. The function takes an object (called `props` by convention, but you can destructure it inline as `{ name }`). It returns JSX — the `<p>` tag with `{name}` inside it. The curly braces `{}` inside JSX mean "evaluate this JavaScript expression and put the result here."

If you render `<Greeting name="Bob" />` instead, you see `Hello, Bob!`. The component is a pure description: "given this name, produce this markup." You do not tell it how to update — you just describe the output.

---

## 5. One-Way Data Flow

Props flow in one direction: DOWN. A parent component passes data to its children as props. A child component receives those props and renders based on them. A child cannot modify its own props — they are read-only.

Here is the WRONG assumption beginners often make:

```jsx
// WRONG: trying to modify a prop directly inside a child
function SpeedDisplay({ velocity }) {
  return (
    <div>
      <p>Velocity: {velocity}</p>
      <button onClick={() => { velocity = 10; }}>Set to 10</button>
    </div>
  );
}
```

This does not work for two reasons. First, props are read-only — assigning to `velocity` changes only the local variable, not the value in the parent. Second, even if the assignment worked, it would not trigger a re-render. The screen would not update.

The correct approach (which you will learn in Lesson 3) is for the child to call a callback function provided by the parent, and the parent updates its own state. But first you need to understand what state IS (Lesson 2). For now, the rule is: **data flows down, events flow up through callbacks.**

---

## 6. With React vs. Without React

Without React, updating a list looks like this:

```js
// Without React — imperative DOM manipulation
function updateVelocityDisplay(velocity) {
  document.getElementById("velocity").textContent = velocity.toFixed(2);
  document.getElementById("velocity-graph").dataset.value = velocity;
  document.getElementById("status-bar").textContent = `v = ${velocity} m/s`;
  // ... and so on for every element that shows velocity
}
```

Every time velocity changes, you must remember every place on the page that shows it and update each one manually.

With React, you just describe the UI based on the data:

```jsx
function VelocityPanel({ velocity }) {
  return (
    <div>
      <p id="velocity">{velocity.toFixed(2)}</p>
      <p id="status-bar">v = {velocity} m/s</p>
    </div>
  );
}
```

When `velocity` changes and React re-renders `VelocityPanel`, every element inside automatically shows the new value. You described the relationship once; React maintains it forever.

---

## 7. Common Mistakes

**Mistake: trying to pass data upward via props.** Props are read-only. You cannot set a prop from inside a child to send information to the parent. You must use a callback function instead.

**Mistake: forgetting to return JSX.** A component that does not return anything renders nothing. This is usually a simple oversight:

```jsx
// WRONG: forgot return
function Label({ text }) {
  <p>{text}</p>; // This does nothing. The JSX is created but not returned.
}

// CORRECT
function Label({ text }) {
  return <p>{text}</p>;
}
```

**Mistake: putting complex logic inside JSX curly braces.** JSX curly braces expect an expression (something that evaluates to a value), not statements. Keep logic in the function body and put only the result in the JSX.

---

## 8. Pros and Cons

React shines when building UIs that change frequently based on data — dashboards, forms, simulations, anything interactive. It handles complex trees of interdependent UI elements gracefully. The learning curve is real but the payoff is substantial for dynamic UIs.

React is overkill for a purely static webpage that never changes. If your page is just text and images with no interactivity, plain HTML is simpler.

---

## 9. Practice Exercise

Create a component called `PhysicsLabel` that takes two props: `label` (a string, like "Position") and `value` (a number, like 5). It should render text in the format: `Position: 5.00 m`. The number should always show two decimal places — look up `toFixed()`.

```jsx
// Expected output when used as:
// <PhysicsLabel label="Position" value={5} />
// Shows: "Position: 5.00 m"

function PhysicsLabel({ label, value }) {
  return <p>{label}: {value.toFixed(2)} m</p>;
}
```

Now use it three times in a parent component to display position, velocity, and acceleration. Notice that you write the same display logic once and reuse it three times with different props. That is the core value of components.

---

## 10. In This Project

Every file in `src/components/` is a React component:

`Controls.jsx` receives the current `simulation` object as a prop (`simulation.position`, `simulation.velocity`, `simulation.acceleration`) and renders text inputs and sliders showing those values. It also receives callback functions (`onSimulationChange`, `onTogglePlayPause`, `onReset`, `onClearRecordedData`, `onModeChange`) that it calls when the user interacts with the UI.

`Simulation3D.jsx` receives a single prop: `position` (a number in meters). It renders a 3D canvas with a ruler and an orange sprite positioned at that coordinate. It does nothing with state, it runs no logic — it just renders whatever position it receives.

`Charts.jsx` receives `data` (which contains the recorded snapshots), `simulation` (for the current values), and `onSetPlaybackTime` (a callback for scrubbing). It renders three line graphs based on the recorded data.

All of these are purely presentational. They have no say in what data they receive. That data comes from `App.jsx`, which is the topic of the next three lessons.
