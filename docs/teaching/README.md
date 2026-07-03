# Teaching Curriculum — 1D Kinematics Simulator

This curriculum exists to take a beginner React developer from zero to a full understanding of this codebase. It is organized as thirteen lessons that build on each other in a specific order. Each lesson has a purpose, a placement rationale, and exercises tied to the real project code.

## Why This Order?

The lessons are sequenced so that each new idea arrives only after the ideas it depends on are already understood. This sounds obvious, but it is easy to get wrong. Most tutorials start with the most visible thing (the component, the JSX, the UI) and then add complexity incrementally. That works for building toy apps. It does not work well for understanding a codebase that already exists, because you can read a file and recognize the syntax without understanding why any of it is there.

This curriculum starts with a map (Lesson 0), then builds the foundation layer by layer. Lesson 0 gives you the whole picture at a glance — the names of all the pieces and how they connect — before you understand any single piece deeply. Every lesson that follows teaches one concept in depth and then explicitly connects it back to where it appears in this project. By Lesson 12, you are not learning new concepts; you are tracing the flows you have already seen described in isolation, now in their combined context.

The sequencing within the foundation (Lessons 1–5) follows the rule that concepts come before the patterns that depend on them. You learn what a React component is (Lesson 1) before you learn how it stores memory (Lesson 2), and both before you learn how siblings share that memory (Lesson 3). You learn about re-renders before you learn about a hook whose entire purpose is to avoid causing them (Lesson 4). You learn about state before you learn about responding to state changes (Lesson 5).

Lessons 6–8 teach the three patterns that make the physics loop work: why long-lived callbacks read stale data (Lesson 6), how to schedule work synchronized to the screen (Lesson 7), and how to decouple physics speed from display speed (Lesson 8). Each lesson would be meaningless without the ones before it.

Lessons 9–11 cover the two rendering libraries used in this project: React Three Fiber for the 3D scene and Chart.js for the graphs. These are placed late because they are add-on tools — powerful but narrow in scope — and you need the React foundation first to understand how they plug in. Lesson 12 is the synthesis: a complete walkthrough of four real user interactions, tracing every step through every lesson's concept.

## Lesson Checklist

| File | Lesson Title | Description | Est. Reading Time |
|---|---|---|---|
| `00-overview.md` | Project Overview | A plain-English map of the app and all its pieces | 10 min |
| `01-react-basics.md` | React Fundamentals | What React is, what a component is, what props are, one-way data flow | 25 min |
| `02-usestate.md` | useState | How components remember values between renders, and why changing state causes a re-render | 25 min |
| `03-lifting-state.md` | Lifting State Up | Why siblings share state through a common parent, and how callbacks bring data back up | 20 min |
| `04-useref.md` | useRef | A mutable box that does not trigger re-renders — when and why to use it instead of state | 20 min |
| `05-useeffect.md` | useEffect | How to run code in response to state changes, how to clean up, and why side effects belong here | 25 min |
| `06-mirror-ref-pattern.md` | The Mirror Ref Pattern | Stale closures and the two ways this project prevents long-lived callbacks from reading old data | 25 min |
| `07-requestanimationframe.md` | requestAnimationFrame | The browser's synchronized animation callback and how to build a continuous loop with it | 20 min |
| `08-fixed-timestep.md` | Fixed Timestep / Accumulator | How to run physics at a constant rate regardless of monitor refresh rate | 20 min |
| `09-react-three-fiber.md` | React Three Fiber | Declarative 3D with React components — how the 3D scene and moving sprite work | 20 min |
| `10-chartjs-basics.md` | Chart.js Basics | How Chart.js renders data-driven line graphs in React | 15 min |
| `11-chartjs-annotation.md` | Chart.js Annotation Plugin | Drawing a vertical playback cursor on top of a chart | 10 min |
| `12-full-picture.md` | Full Picture — End-to-End Data Flow | Four complete user interactions traced step by step through all prior lessons | 30 min |

---

Before reading any lesson, read `00-overview.md` first — even if you are tempted to skip ahead.
