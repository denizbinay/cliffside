# ADR 001: Deterministic Simulation Architecture

## Status
Accepted

## Context
Cliffside is a competitive PVP game where fairness, replayability, and network prediction are critical. To support these features, the core gameplay simulation must be strictly deterministic. This means that for a given initial state (seed) and a sequence of inputs, the simulation must produce the exact same state at any specific tick, regardless of the machine or frame rate.

## Decision
We will enforce a strict separation between **Simulation** (gameplay logic) and **Presentation** (rendering/UI).

### 1. Simulation Loop
- **Fixed Timestep:** The simulation (`src/sim`) advances in fixed 50ms ticks.
- **No Wall-Clock Time:** Gameplay logic MUST NOT use `Date.now()`, `performance.now()`, or `Phaser.Time` for logic calculations. All durations and cooldowns must be measured in ticks or accumulated milliseconds from the `SimClock`.
- **ECS Systems:** State mutation occurs ONLY within ECS systems or specific Sim helper functions (`ActionSystem`, `DamagePipeline`).

### 2. Randomness (RNG)
- **Seeded Only:** All gameplay probabilities (crit, proc chance, spawn locations) MUST use `ctx.world.sim.rng` (the seeded implementation).
- **Global RNG Forbidden:** `Math.random()` is strictly forbidden in `src/sim` and `src/ecs`.

### 3. Input & Commands
- **Command Pattern:** Player actions are converted into serializable commands (Cast, Move, Buy) and queued.
- **Processing:** Commands are processed at the start of the tick.

### 4. Floating Point Safety
- **Avoid Precision Drift:** Where possible, use integer math or stable floating point operations. Be aware that transcendental functions (`sin`, `cos`) can vary slightly across browsers/architectures, though we accept this risk for now until strict fixed-point is needed.

### 5. Presentation Decoupling
- **Read-Only:** The `GameScene` and UI components read from the Sim state but never write to it directly.
- **Events:** The Sim emits events via `SimEventBus` for things like "Damage Taken" or "Spell Cast". The UI listens to these to play sounds or show particles.

## Consequences
- **Development Friction:** Developers cannot just use `setTimeout` for a gameplay delay; they must use a tick-based timer or scheduler.
- **Strictness:** PRs failing the "Determinism Checklist" must be rejected.
- **Testing:** We can now write "Golden Tests" that verify the entire game replay stays valid.
