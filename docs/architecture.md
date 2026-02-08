# Architecture

Cliffside Castle Conquest uses a **Simulation vs Presentation split architecture**. The ECS (Entity Component System) handles all game simulation logic deterministically, while Phaser scenes handle rendering, input, and visual effects.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         SIMULATION                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  GameWorld   │───>│   Systems    │───>│  Components  │       │
│  │  (ECS State) │    │  (Queries)   │    │  (bitECS)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                    │                    │              │
│         │                    ▼                    │              │
│         │           ┌──────────────┐              │              │
│         │           │DamagePipeline│              │              │
│         │           │   (hooks)    │              │              │
│         │           └──────────────┘              │              │
└─────────┼────────────────────────────────────────┼──────────────┘
          │                                        │
          ▼                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ RenderStore  │<───│RenderSystems │<───│Phaser Objects│       │
│  │(eid->visual) │    │ (Sprite,etc) │    │ (Containers) │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                              │                                   │
│                              ▼                                   │
│                      ┌──────────────┐                            │
│                      │ UiStateBridge│───> UI                     │
│                      └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### Fixed Timestep Simulation
- Simulation runs at fixed 50ms intervals regardless of framerate
- Render updates every frame using latest simulation state
- Enables deterministic replays with same seed

### Index-Based Store References
- ECS components store numeric indices (not object references)
- Stores (`RenderStore`, `ConfigStore`) use indices as keys
- Avoids object references in typed arrays

### Factory Pattern for Entity Creation
- `createUnit()`, `createCastle()`, etc. handle component setup
- Separate `createUnitVisuals()` for presentation
- Clean separation of simulation vs render concerns

### Event Bridge Pattern
- `EventBridge` translates scene events to ECS mutations
- `UiStateBridge` projects ECS state to UI format
- Decouples presentation layer from simulation internals

### Priority-Ordered System Execution
- `SystemScheduler` runs systems in priority order
- Lower priority number = runs first
- Groups: Pre-logic -> AI -> Physics -> Combat -> Health -> Render

---

## Scene Lifecycle

```
BootScene -> PreloadScene -> TitleScene -> GameScene
                                 |
                           (dev mode skips to GameScene)
```

### BootScene
Minimal entry point that immediately transitions to PreloadScene.

### PreloadScene
Asset loading with visual progress bar. Loads:
- Environment assets (backgrounds, platforms, bridge)
- Structure assets (castles, turrets, flags)
- Unit spritesheets and atlases
- Creates all unit animations

### TitleScene
Title screen with game rules and start button. Skipped in dev mode (`?dev` URL param).

### GameScene
Main gameplay scene that orchestrates all systems:
- Creates and owns `GameSceneBridge` (ECS integration)
- Creates `EconomySystem`, `ShopManager`, `WaveManager`, `AIController`
- Runs simulation loop via `runSimulationTick()`
- Emits UI state updates

---

## Scene-ECS Integration

### GameSceneBridge (`src/ecs/bridges/GameSceneBridge.ts`)

Main integration layer between GameScene and ECS world.

| Property | Type | Purpose |
|----------|------|---------|
| `world` | `GameWorld` | ECS world with simulation state |
| `scheduler` | `SystemScheduler` | Ordered system execution |
| `renderStore` | `RenderStore` | Entity-to-visual mapping |
| `configStore` | `ConfigStore` | Unit type definitions |
| `unitPool` | `UnitPool` | Entity recycling |
| `eventBridge` | `EventBridge` | Scene-to-ECS event forwarding |
| `uiStateBridge` | `UiStateBridge` | ECS-to-UI state projection |

### System Execution Order

Systems run in priority order (lower priority = runs first):

1. **Pre-logic:** ActiveEffects, StatModifiers, Resources, Visibility
2. **Status/Targeting:** Status, Cooldown, Targeting, Actions
3. **Physics:** Displacement, Collision, Movement
4. **Combat:** Combat, Healer
5. **Health:** Shields, Health, Cleanup
6. **Render:** Sprite, HealthBars, StatusDots, Animation, Effects

Exact priorities are defined in `src/ecs/constants.ts`.

---

## Runtime Stores

### RenderStore (`src/ecs/stores/RenderStore.ts`)
Maps ECS entity IDs to Phaser visual objects (containers, sprites, health bars).

### ConfigStore (`src/ecs/stores/ConfigStore.ts`)
Unit type configuration lookup. Stores indexed array for efficient component storage.

### ActiveEffectsStore (`src/ecs/stores/ActiveEffectsStore.ts`)
Variable-length effect lists per entity. Map-based because ECS components are fixed-size.

### UnitPool (`src/ecs/stores/UnitPool.ts`)
Entity ID recycling to reduce allocations and garbage collection.

---

## Data Flow

### Combat Event Flow

```
1. CombatSystem detects attack conditions
2. DamagePipeline.applyDamage() called
3. Pipeline hooks modify damage (armor, crits, etc.)
4. Health.current[target] -= finalDamage
5. CombatEventBus.emit("afterDamage", context)
6. HealthSystem marks for cleanup if HP <= 0
7. CleanupSystem destroys visuals, recycles entity
8. RenderSystems update remaining entities
9. emitUiState() broadcasts to UI
```

### Input Event Flow

```
1. UI emits Phaser event (e.g., "queue-add")
2. GameScene.events listener receives payload
3. WaveManager processes queue addition
4. On wave send: spawnUnit() called per queued unit
5. ECS entity + components created via factories
6. Render visuals created via createUnitVisuals()
7. RenderStore maps eid -> Phaser container
8. Systems process new entity next tick
```

---

## File Reference

| Path | Purpose |
|------|---------|
| `src/scenes/GameScene.ts` | Main game orchestration |
| `src/ecs/bridges/GameSceneBridge.ts` | Scene-ECS integration |
| `src/ecs/bridges/EventBridge.ts` | Scene events -> ECS mutations |
| `src/ecs/bridges/UiStateBridge.ts` | ECS queries -> UI state |
| `src/ecs/stores/RenderStore.ts` | Entity -> Phaser visual mapping |
| `src/ecs/world.ts` | GameWorld creation |
| `src/sim/SimClock.ts` | Fixed timestep accumulator |
