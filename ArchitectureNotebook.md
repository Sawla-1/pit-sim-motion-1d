# Migration Phase 1: Lesson 1 — Separation of Concerns

### Problem

App.jsx contained UI code, physics calculations, recording logic, and playback logic.

### Solution

Move pure physics and playback logic into the simulation layer.

### Principle Learned

A function should live where its responsibility belongs, not where it happened to be written first.

### Question I can now answer

Why does calculatePhysicsStep() belong in kinematics1d.js?