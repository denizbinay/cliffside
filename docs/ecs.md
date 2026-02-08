# Entity Component System

Cliffside uses **bitECS** for high-performance entity management with components stored in typed arrays.

## World

**File:** `src/ecs/world.ts`

The `GameWorld` extends bitECS's `IWorld` with game-specific state including time tracking, simulation tick, seeded RNG, and the DamagePipeline.

---

## Components

**Location:** `src/ecs/components/`

All components use `defineComponent` from bitECS with typed array storage. Access fields via `Component.field[eid]`.

### Core Components

| Component | Purpose | File |
|-----------|---------|------|
| `Position` | X/Y world coordinates | `Position.ts` |
| `Velocity` | Movement velocity and base speed | `Velocity.ts` |
| `Health` | Current and max HP | `Health.ts` |
| `Combat` | Damage, range, attack rate, cooldown | `Combat.ts` |
| `StatusEffects` | Stun/slow/buff timers and power | `StatusEffects.ts` |
| `Faction` | Player/AI/Neutral team | `Faction.ts` |
| `Role` | Frontline/Damage/Support/Disruptor | `Role.ts` |
| `Target` | Current attack target entity | `Target.ts` |
| `Animation` | Current action and lock state | `Animation.ts` |
| `EntityType` | Bitmask: Unit/Castle/Turret/etc | `EntityType.ts` |
| `Death` | Death sequence state | `Death.ts` |
| `Render` | Store index for visuals | `Render.ts` |
| `UnitConfig` | Type index for config lookup | `UnitConfig.ts` |
| `Presence` | Control point capture strength | `Presence.ts` |
| `Collision` | Blocking state for battle lines | `Collision.ts` |

**Canonical example:** `src/ecs/components/Position.ts`

---

## Systems

**Location:** `src/ecs/systems/`

Systems are factory functions returning `(world: GameWorld) => GameWorld`. They're registered with `SystemScheduler` and run in priority order (lower = earlier).

### Core Systems

| System | Purpose |
|--------|---------|
| `CollisionSystem` | Populates blocking state for battle lines |
| `MovementSystem` | Moves units toward enemy castle |
| `TargetingSystem` | Finds closest enemy in range |
| `CombatSystem` | Initiates attacks via ActionSystem |
| `HealerSystem` | Support units heal most injured ally |
| `ActionSystemECS` | Ticks ability state machine |
| `StatusSystem` | Decrements status effect timers |
| `HealthSystem` | Triggers death on HP <= 0 |
| `CleanupSystem` | Removes dead entities |

### Render Systems

| System | Purpose |
|--------|---------|
| `SpriteSystem` | Syncs positions to Phaser containers |
| `AnimationSystem` | Maps actions to sprite animations |
| `HealthBarSystem` | Updates health bar fill |
| `FlashEffectSystem` | Flashes on damage/heal |
| `StatusDotSystem` | Shows status indicators |

System priorities are defined in `src/ecs/constants.ts`.

**Canonical example:** `src/ecs/systems/TargetingSystem.ts`

---

## Queries

**Location:** `src/ecs/queries/`

Queries filter entities by component combination. Results are cached for performance.

```typescript
const units = aliveUnitsQuery(world);
const playerUnits = getAliveUnitsByFaction(world, FACTION.PLAYER);
const count = countAliveUnits(world, FACTION.AI);
```

**Canonical example:** `src/ecs/queries/aliveUnits.ts`

---

## Archetypes

**Location:** `src/ecs/archetypes/`

Archetypes define which components an entity type has. Each archetype function adds all required components and sets `EntityType.value`.

| Archetype | Entity Type |
|-----------|-------------|
| `unitArchetype` | Spawned units with movement, combat, health |
| `castleArchetype` | Player/AI castles |
| `turretArchetype` | Defensive turrets |
| `controlPointArchetype` | Bridge control zones |

**Canonical example:** `src/ecs/archetypes/unitArchetype.ts`

---

## Factories

**Location:** `src/ecs/factories/`

Factory functions create and initialize entities with appropriate archetypes and component values.

| Factory | Purpose |
|---------|---------|
| `createUnit` | Creates unit from `UnitTypeConfig` with modifiers |
| `createCastle` | Creates player/AI castle |
| `createTurret` | Creates defensive turret |
| `createControlPoint` | Creates bridge control zone |

**Canonical example:** `src/ecs/factories/createUnit.ts`

---

## Spatial Hashing

**File:** `src/ecs/spatial/SpatialHash.ts`

1D spatial hash for efficient neighbor queries in lane-based gameplay.

```typescript
spatialHash.clear();
spatialHash.insert(eid, Position.x[eid]);
const nearby = spatialHash.queryRadius(centerX, 100);
```

---

## Constants

**File:** `src/ecs/constants.ts`

Contains `MAX_ENTITIES`, `ENTITY_TYPE` bitmask values, and `SYSTEM_PRIORITY` constants. Reference this file for current values.

---

## Stores

**Location:** `src/ecs/stores/`

External stores for data that doesn't fit bitECS's fixed-size component model:

| Store | Purpose |
|-------|---------|
| `RenderStore` | Maps entity IDs to Phaser visual objects |
| `ConfigStore` | Unit type configuration lookup by index |
| `ActiveEffectsStore` | Variable-length effect lists per entity |
| `UnitPool` | Entity ID recycling to reduce GC |
