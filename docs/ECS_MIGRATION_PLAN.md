# Cliffside Castle Conquest: ECS Architecture Migration Plan

## Executive Summary

This document outlines a complete migration from the current OOP-based architecture to a **bitECS**-powered Entity Component System. The migration is divided into **7 phases**, each designed to be executable by independent agents with semi-isolated context requirements.

### Current Architecture Problems

| Problem | Location | Impact |
|---------|----------|--------|
| **Monolithic entities** | `Unit.ts` (527 lines) | Data + behavior + rendering tightly coupled |
| **God object scene** | `GameScene.ts` (1231 lines) | Hard to test, hard to extend |
| **No component composition** | All entities | Can't easily query/filter by capability |
| **Embedded rendering** | Entity classes | Can't separate game logic from visuals |
| **Tight coupling** | Systems access scene properties directly | Hard to unit test |

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ECS WORLD                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  COMPONENTS (Pure Data)                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Position │ │ Velocity │ │ Health   │ │ Combat   │ │ StatusEffects    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Faction  │ │ Role     │ │ Target   │ │ Animation│ │ Render (refs)    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  SYSTEMS (Pure Logic) - Execution Order                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ 1. Input   │→│ 2. AI      │→│ 3. Movement│→│ 4. Combat  │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ 5. Status  │→│ 6. Health  │→│ 7. Cleanup │→│ 8. Render  │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
├─────────────────────────────────────────────────────────────────────────────┤
│  QUERIES (Entity Filters)                                                    │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐       │
│  │ AliveUnits         │ │ PlayerFaction      │ │ InCombatRange      │       │
│  │ [Health, Position] │ │ [Faction=Player]   │ │ [Position, Combat] │       │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Migration Strategy: Incremental with Dual Systems

Each phase maintains backward compatibility by running old and new systems in parallel:
- **Bridge Adapters**: Sync state between legacy objects and ECS components
- **Feature Flags**: Toggle between old/new implementations per system
- **Gradual Cutover**: Old code is only removed after new code is proven stable

---

## Phase Overview

| Phase | Name | Duration | Dependencies | Key Deliverables |
|-------|------|----------|--------------|------------------|
| 0 | Foundation & Infrastructure | 2-3 days | None | bitECS setup, folder structure, base types |
| 1 | Component Definitions | 2-3 days | Phase 0 | All 15 components defined and tested |
| 2 | Entity Factory & World Setup | 3-4 days | Phase 1 | Entity creation, archetypes, world lifecycle |
| 3 | Core Game Systems | 4-5 days | Phase 2 | Movement, Combat, Status, Health systems |
| 4 | Rendering Systems | 3-4 days | Phase 3 | Sprite sync, health bars, VFX systems |
| 5 | UI & Events Integration | 2-3 days | Phase 4 | UI state queries, event bridge |
| 6 | Legacy Cleanup & Optimization | 3-4 days | Phase 5 | Remove old code, optimize queries |

**Total Estimated Duration**: 19-26 days

---

## Phase 0: Foundation & Infrastructure

### Objective
Set up the bitECS library, establish folder structure, create base types, and define the component/system registration pattern.

### Entry Criteria
- [x] Access to codebase
- [x] Understanding of current architecture (see `types.ts`, `GameScene.ts`)

### Files to Create

```
src/
├── ecs/
│   ├── index.ts                    # Public API exports
│   ├── world.ts                    # World creation and lifecycle
│   ├── types.ts                    # ECS-specific type definitions
│   ├── constants.ts                # Entity limits, component IDs
│   ├── components/
│   │   └── index.ts                # Component barrel export
│   ├── systems/
│   │   ├── index.ts                # System barrel export
│   │   └── SystemScheduler.ts      # System execution order manager
│   ├── queries/
│   │   └── index.ts                # Query definitions
│   ├── archetypes/
│   │   └── index.ts                # Entity archetypes (unit, castle, turret)
│   └── bridges/
│       └── LegacyBridge.ts         # Sync between legacy and ECS
```

### Implementation Details

#### 1. Install bitECS
```bash
npm install bitecs
```

#### 2. Create `src/ecs/constants.ts`
```typescript
// Maximum entities in the world
export const MAX_ENTITIES = 1000;

// Component type identifiers (for debugging)
export const COMPONENT_IDS = {
  POSITION: 0,
  VELOCITY: 1,
  HEALTH: 2,
  COMBAT: 3,
  // ... etc
} as const;

// System execution priorities (lower = earlier)
export const SYSTEM_PRIORITY = {
  INPUT: 0,
  AI: 10,
  MOVEMENT: 20,
  COMBAT: 30,
  STATUS: 40,
  HEALTH: 50,
  CLEANUP: 60,
  RENDER: 100,
} as const;

// Entity type tags (bitfield values)
export const ENTITY_TYPE = {
  UNIT: 1 << 0,
  CASTLE: 1 << 1,
  TURRET: 1 << 2,
  PROJECTILE: 1 << 3,
  CONTROL_POINT: 1 << 4,
} as const;
```

#### 3. Create `src/ecs/world.ts`
```typescript
import { createWorld, IWorld, resetWorld } from 'bitecs';

export interface GameWorld extends IWorld {
  time: {
    delta: number;
    elapsed: number;
    now: number;
  };
  scene: Phaser.Scene | null;
}

export function createGameWorld(): GameWorld {
  const world = createWorld() as GameWorld;
  world.time = { delta: 0, elapsed: 0, now: 0 };
  world.scene = null;
  return world;
}

export function resetGameWorld(world: GameWorld): void {
  resetWorld(world);
  world.time = { delta: 0, elapsed: 0, now: 0 };
  world.scene = null;
}

export function updateWorldTime(world: GameWorld, delta: number, now: number): void {
  world.time.delta = delta;
  world.time.elapsed += delta;
  world.time.now = now;
}
```

#### 4. Create `src/ecs/types.ts`
```typescript
import type { IWorld } from 'bitecs';
import type { GameWorld } from './world';

// Entity ID type (number in bitECS)
export type EntityId = number;

// System function signature
export type System = (world: GameWorld) => GameWorld;

// System with metadata
export interface SystemDef {
  name: string;
  priority: number;
  system: System;
  enabled: boolean;
}

// Component value types for type-safe access
export interface ComponentSchemas {
  Position: { x: number; y: number };
  Velocity: { vx: number; vy: number };
  Health: { current: number; max: number };
  Combat: { damage: number; range: number; attackRate: number; cooldown: number };
  // ... defined in Phase 1
}
```

#### 5. Create `src/ecs/systems/SystemScheduler.ts`
```typescript
import type { GameWorld, System, SystemDef } from '../types';
import { SYSTEM_PRIORITY } from '../constants';

export class SystemScheduler {
  private systems: SystemDef[] = [];
  private sorted = false;

  register(name: string, system: System, priority: number = 50): void {
    this.systems.push({ name, system, priority, enabled: true });
    this.sorted = false;
  }

  enable(name: string): void {
    const sys = this.systems.find(s => s.name === name);
    if (sys) sys.enabled = true;
  }

  disable(name: string): void {
    const sys = this.systems.find(s => s.name === name);
    if (sys) sys.enabled = false;
  }

  run(world: GameWorld): GameWorld {
    if (!this.sorted) {
      this.systems.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }
    
    for (const { system, enabled, name } of this.systems) {
      if (enabled) {
        try {
          world = system(world);
        } catch (err) {
          console.error(`System "${name}" error:`, err);
        }
      }
    }
    return world;
  }

  getSystemNames(): string[] {
    return this.systems.map(s => s.name);
  }
}
```

### Tests to Write

| Test File | Description |
|-----------|-------------|
| `tests/ecs/world.test.ts` | World creation, time updates, reset |
| `tests/ecs/SystemScheduler.test.ts` | System registration, ordering, enable/disable |

### Exit Criteria
- [x] `npm install bitecs` successful
- [x] All files in `src/ecs/` created
- [x] World creation and reset works
- [x] SystemScheduler executes systems in priority order
- [x] All tests pass

### Execution Notes
- Added ECS foundation files and placeholder barrels for components/queries/archetypes.
- Implemented `GameWorld` helpers and `SystemScheduler`, plus baseline ECS tests.
- Installed `bitecs` with `npm install --legacy-peer-deps` to resolve peer dependency conflicts.
- Ran `npm test -- tests/ecs/world.test.ts tests/ecs/SystemScheduler.test.ts`.

### Documentation Deliverable
Create `docs/ECS_PHASE_0_COMPLETE.md` with:
- List of all created files
- API documentation for `createGameWorld()`, `SystemScheduler`
- Example usage snippets
- Known limitations or decisions made

---

## Phase 1: Component Definitions

### Objective
Define all ECS components that will represent game state. Components are pure data with no behavior.

### Entry Criteria
- [x] Phase 0 complete
- [x] Understanding of current entity properties (see `Unit.ts:47-77`, `Castle.ts:14-28`, `Turret.ts:12-23`)

### Files to Create/Modify

```
src/ecs/components/
├── index.ts                 # Barrel export
├── Position.ts              # x, y coordinates
├── Velocity.ts              # vx, vy movement
├── Health.ts                # current, max HP
├── Combat.ts                # damage, range, attackRate, cooldown
├── StatusEffects.ts         # stun, slow, buff timers
├── Faction.ts               # player/ai tag
├── Role.ts                  # frontline/damage/support/disruptor
├── Target.ts                # current target entity ID
├── Animation.ts             # current anim, locked state
├── Render.ts                # Phaser object references (external storage)
├── UnitConfig.ts            # reference to static unit type data
├── Presence.ts              # control point presence multiplier
├── Death.ts                 # death state, cleanup timing
├── EntityType.ts            # unit/castle/turret tag
```

### Component Definitions

#### `Position.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
});
```

#### `Velocity.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Velocity = defineComponent({
  vx: Types.f32,
  vy: Types.f32,
  baseSpeed: Types.f32,   // original speed before modifiers
});
```

#### `Health.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
});
```

#### `Combat.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Combat = defineComponent({
  damage: Types.f32,
  range: Types.f32,
  attackRate: Types.f32,
  cooldown: Types.f32,      // time until next attack
  healAmount: Types.f32,    // for support units
});
```

#### `StatusEffects.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const StatusEffects = defineComponent({
  stunTimer: Types.f32,
  slowTimer: Types.f32,
  slowPower: Types.f32,     // speed multiplier when slowed (0-1)
  buffTimer: Types.f32,
  buffPower: Types.f32,     // damage multiplier when buffed
});
```

#### `Faction.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

// 0 = neutral, 1 = player, 2 = ai
export const Faction = defineComponent({
  value: Types.ui8,
});

export const FACTION = {
  NEUTRAL: 0,
  PLAYER: 1,
  AI: 2,
} as const;
```

#### `Role.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

// 0 = none, 1 = frontline, 2 = damage, 3 = support, 4 = disruptor
export const Role = defineComponent({
  value: Types.ui8,
});

export const ROLE = {
  NONE: 0,
  FRONTLINE: 1,
  DAMAGE: 2,
  SUPPORT: 3,
  DISRUPTOR: 4,
} as const;
```

#### `Target.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Target = defineComponent({
  entityId: Types.eid,      // bitECS entity ID
  distance: Types.f32,      // cached distance to target
});
```

#### `Animation.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

// Animation state for render system
export const Animation = defineComponent({
  currentAction: Types.ui8,   // 0=idle, 1=run, 2=attack, 3=hit, 4=death
  locked: Types.ui8,          // boolean (0/1)
  lockUntil: Types.f32,       // timestamp when lock expires
});

export const ANIM_ACTION = {
  IDLE: 0,
  RUN: 1,
  ATTACK: 2,
  HIT: 3,
  DEATH: 4,
} as const;
```

#### `Render.ts` (Special - External Storage)
```typescript
import { defineComponent, Types } from 'bitecs';

// This component only stores an index into an external Map
// Actual Phaser objects are stored in RenderStore (not in ECS)
export const Render = defineComponent({
  storeIndex: Types.ui32,     // index into external render store
  visible: Types.ui8,         // boolean (0/1)
  depth: Types.ui8,           // z-order
});
```

#### `UnitConfig.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

// Reference to static config by index (not the config itself)
export const UnitConfig = defineComponent({
  typeIndex: Types.ui16,      // index into UNIT_TYPES array
  size: Types.f32,            // computed size for this unit
  color: Types.ui32,          // base color (for shapes)
});
```

#### `Presence.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Presence = defineComponent({
  baseValue: Types.f32,       // from unit config
  multiplier: Types.f32,      // from stance modifiers
});
```

#### `Death.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

export const Death = defineComponent({
  started: Types.ui8,         // boolean
  animDone: Types.ui8,        // boolean
  cleanupAt: Types.f32,       // timestamp for cleanup
});
```

#### `EntityType.ts`
```typescript
import { defineComponent, Types } from 'bitecs';

// Bitfield for entity type tags
export const EntityType = defineComponent({
  value: Types.ui8,           // ENTITY_TYPE bitfield
});
```

### External Storage Pattern

For Phaser objects (which can't be stored in typed arrays), use external storage:

```typescript
// src/ecs/stores/RenderStore.ts
export class RenderStore {
  private objects: Map<number, {
    container: Phaser.GameObjects.Container;
    mainShape: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite;
    healthBar: Phaser.GameObjects.Rectangle;
    healthFill: Phaser.GameObjects.Rectangle;
    statusDots: Phaser.GameObjects.Container;
  }> = new Map();
  
  private nextIndex = 1;

  create(data: { ... }): number {
    const index = this.nextIndex++;
    this.objects.set(index, data);
    return index;
  }

  get(index: number) {
    return this.objects.get(index);
  }

  delete(index: number): void {
    const obj = this.objects.get(index);
    if (obj) {
      obj.container.destroy();
      obj.healthBar.destroy();
      obj.healthFill.destroy();
      this.objects.delete(index);
    }
  }

  clear(): void {
    for (const [_, obj] of this.objects) {
      obj.container.destroy();
      obj.healthBar.destroy();
      obj.healthFill.destroy();
    }
    this.objects.clear();
    this.nextIndex = 1;
  }
}
```

### Tests to Write

| Test File | Description |
|-----------|-------------|
| `tests/ecs/components/Position.test.ts` | Add/get position, type safety |
| `tests/ecs/components/Health.test.ts` | Health clamping, death detection |
| `tests/ecs/components/StatusEffects.test.ts` | Timer decrement behavior |
| `tests/ecs/stores/RenderStore.test.ts` | Create, get, delete, clear |

### Exit Criteria
- [x] All 15 components defined in `src/ecs/components/`
- [x] RenderStore implemented for Phaser object storage
- [x] Type exports for component access
- [x] All component tests pass

### Execution Notes
- Implemented all Phase 1 components and component barrel exports.
- Added `RenderStore` for Phaser object storage and teardown.
- Added component tests plus `RenderStore` tests under `tests/ecs/`.
- Ran `npm test -- tests/ecs/components/Position.test.ts tests/ecs/components/Health.test.ts tests/ecs/components/StatusEffects.test.ts tests/ecs/stores/RenderStore.test.ts`.

### Documentation Deliverable
Create `docs/ECS_PHASE_1_COMPLETE.md` with:
- Component schema reference table
- FACTION, ROLE, ANIM_ACTION enum values
- RenderStore API documentation
- Mapping table: Legacy property → ECS component

---

## Phase 2: Entity Factory & World Setup

### Objective
Create factory functions for spawning ECS entities, define archetypes for common entity types, and integrate the ECS world into the GameScene lifecycle.

### Entry Criteria
- [x] Phase 1 complete
- [x] Understanding of entity creation in `GameScene.ts:655-679`, `Unit.ts` constructor

### Files to Create/Modify

```
src/ecs/
├── archetypes/
│   ├── index.ts
│   ├── unitArchetype.ts        # Unit entity setup
│   ├── castleArchetype.ts      # Castle entity setup
│   ├── turretArchetype.ts      # Turret entity setup
│   └── controlPointArchetype.ts
├── factories/
│   ├── index.ts
│   ├── createUnit.ts           # Unit factory
│   ├── createCastle.ts         # Castle factory
│   ├── createTurret.ts         # Turret factory
│   └── createControlPoint.ts
├── stores/
│   ├── RenderStore.ts          # (from Phase 1)
│   ├── ConfigStore.ts          # Unit type config lookup
│   └── EntityRegistry.ts       # Map entity IDs to legacy objects
└── bridges/
    ├── LegacyBridge.ts         # Sync ECS ↔ legacy
    └── GameSceneBridge.ts      # Integrate world into scene
```

### Implementation Details

#### `unitArchetype.ts`
```typescript
import { addComponent, addEntity } from 'bitecs';
import { Position, Velocity, Health, Combat, StatusEffects, 
         Faction, Role, Target, Animation, Render, UnitConfig, 
         Presence, Death, EntityType } from '../components';
import { ENTITY_TYPE } from '../constants';
import type { GameWorld } from '../world';

export function createUnitArchetype(world: GameWorld, eid: number): void {
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, Health, eid);
  addComponent(world, Combat, eid);
  addComponent(world, StatusEffects, eid);
  addComponent(world, Faction, eid);
  addComponent(world, Role, eid);
  addComponent(world, Target, eid);
  addComponent(world, Animation, eid);
  addComponent(world, Render, eid);
  addComponent(world, UnitConfig, eid);
  addComponent(world, Presence, eid);
  addComponent(world, Death, eid);
  addComponent(world, EntityType, eid);
  
  EntityType.value[eid] = ENTITY_TYPE.UNIT;
}
```

#### `createUnit.ts`
```typescript
import { addEntity } from 'bitecs';
import { createUnitArchetype } from '../archetypes/unitArchetype';
import { Position, Velocity, Health, Combat, StatusEffects,
         Faction, Role, UnitConfig, Presence, Death, Animation, Render } from '../components';
import { FACTION, ROLE, ANIM_ACTION } from '../components';
import type { GameWorld } from '../world';
import type { UnitTypeConfig, Side, StanceModifiers } from '../../types';

export interface CreateUnitOptions {
  config: UnitTypeConfig;
  side: Side;
  x: number;
  y: number;
  modifiers?: Partial<StanceModifiers>;
  presenceMult?: number;
}

export function createUnit(world: GameWorld, options: CreateUnitOptions): number {
  const { config, side, x, y, modifiers = {}, presenceMult = 1 } = options;
  
  const eid = addEntity(world);
  createUnitArchetype(world, eid);
  
  // Position
  Position.x[eid] = x;
  Position.y[eid] = y;
  
  // Velocity
  const speedMult = modifiers.speedMult || 1;
  Velocity.baseSpeed[eid] = config.speed * speedMult;
  Velocity.vx[eid] = 0;
  Velocity.vy[eid] = 0;
  
  // Health
  const hpMult = modifiers.hpMult || 1;
  Health.max[eid] = config.hp * hpMult;
  Health.current[eid] = Health.max[eid];
  
  // Combat
  const dmgMult = modifiers.dmgMult || 1;
  const rangeMult = modifiers.rangeMult || 1;
  const attackRateMult = modifiers.attackRateMult || 1;
  const healMult = modifiers.healMult || 1;
  Combat.damage[eid] = config.dmg * dmgMult;
  Combat.range[eid] = config.range * rangeMult;
  Combat.attackRate[eid] = config.attackRate * attackRateMult;
  Combat.cooldown[eid] = 0;
  Combat.healAmount[eid] = (config.healAmount || 0) * healMult;
  
  // Status effects - all start at 0
  StatusEffects.stunTimer[eid] = 0;
  StatusEffects.slowTimer[eid] = 0;
  StatusEffects.slowPower[eid] = 1;
  StatusEffects.buffTimer[eid] = 0;
  StatusEffects.buffPower[eid] = 1;
  
  // Faction
  Faction.value[eid] = side === 'player' ? FACTION.PLAYER : FACTION.AI;
  
  // Role
  Role.value[eid] = ROLE[config.role.toUpperCase() as keyof typeof ROLE] || ROLE.DAMAGE;
  
  // Presence
  Presence.baseValue[eid] = config.presence;
  Presence.multiplier[eid] = presenceMult;
  
  // Death - not dead
  Death.started[eid] = 0;
  Death.animDone[eid] = 0;
  Death.cleanupAt[eid] = 0;
  
  // Animation
  Animation.currentAction[eid] = ANIM_ACTION.IDLE;
  Animation.locked[eid] = 0;
  Animation.lockUntil[eid] = 0;
  
  // Render.storeIndex will be set by RenderSystem when creating visuals
  
  return eid;
}
```

#### `EntityRegistry.ts`
```typescript
// Bidirectional mapping between ECS entities and legacy objects
export class EntityRegistry {
  private ecsToLegacy: Map<number, Unit | Castle | Turret> = new Map();
  private legacyToEcs: Map<Unit | Castle | Turret, number> = new Map();
  
  register(eid: number, legacyObject: Unit | Castle | Turret): void {
    this.ecsToLegacy.set(eid, legacyObject);
    this.legacyToEcs.set(legacyObject, eid);
  }
  
  getLegacy(eid: number): Unit | Castle | Turret | undefined {
    return this.ecsToLegacy.get(eid);
  }
  
  getEcs(legacyObject: Unit | Castle | Turret): number | undefined {
    return this.legacyToEcs.get(legacyObject);
  }
  
  unregister(eid: number): void {
    const legacy = this.ecsToLegacy.get(eid);
    if (legacy) {
      this.legacyToEcs.delete(legacy);
    }
    this.ecsToLegacy.delete(eid);
  }
  
  clear(): void {
    this.ecsToLegacy.clear();
    this.legacyToEcs.clear();
  }
}
```

#### `GameSceneBridge.ts`
```typescript
import { createGameWorld, updateWorldTime, resetGameWorld } from '../world';
import { SystemScheduler } from '../systems/SystemScheduler';
import { RenderStore } from '../stores/RenderStore';
import { EntityRegistry } from '../stores/EntityRegistry';
import type { GameWorld } from '../world';
import type GameScene from '../../scenes/GameScene';

export class GameSceneBridge {
  world: GameWorld;
  scheduler: SystemScheduler;
  renderStore: RenderStore;
  entityRegistry: EntityRegistry;
  
  private scene: GameScene;
  
  constructor(scene: GameScene) {
    this.scene = scene;
    this.world = createGameWorld();
    this.world.scene = scene;
    this.scheduler = new SystemScheduler();
    this.renderStore = new RenderStore();
    this.entityRegistry = new EntityRegistry();
  }
  
  update(delta: number, now: number): void {
    updateWorldTime(this.world, delta, now);
    this.scheduler.run(this.world);
  }
  
  destroy(): void {
    this.renderStore.clear();
    this.entityRegistry.clear();
    resetGameWorld(this.world);
  }
}
```

### Integration with GameScene

Modify `GameScene.ts` to initialize the ECS bridge:

```typescript
// In GameScene.create()
import { GameSceneBridge } from '../ecs/bridges/GameSceneBridge';

// Add property
ecsBridge!: GameSceneBridge;

// In create():
this.ecsBridge = new GameSceneBridge(this);

// In update():
this.ecsBridge.update(delta, this.time.now);

// In shutdown event:
this.ecsBridge.destroy();
```

### Tests to Write

| Test File | Description |
|-----------|-------------|
| `tests/ecs/factories/createUnit.test.ts` | Entity creation, component initialization |
| `tests/ecs/stores/EntityRegistry.test.ts` | Bidirectional mapping |
| `tests/ecs/bridges/GameSceneBridge.test.ts` | World lifecycle |

### Exit Criteria
- [x] All factory functions work
- [x] Archetypes apply correct components
- [x] EntityRegistry maps legacy ↔ ECS
- [x] GameSceneBridge integrates with scene
- [x] Can create 100 units without errors

### Execution Notes
- Added unit/castle/turret/control point archetypes and factory helpers for entity creation.
- Implemented `ConfigStore` for unit config lookup and `EntityRegistry` for legacy ↔ ECS mapping.
- Added `GameSceneBridge` and wired it into `GameScene` lifecycle.
- Added factory/store/bridge tests under `tests/ecs/`.
- Ran `npm test -- tests/ecs/factories/createUnit.test.ts tests/ecs/stores/EntityRegistry.test.ts tests/ecs/bridges/GameSceneBridge.test.ts`.

### Documentation Deliverable
Create `docs/ECS_PHASE_2_COMPLETE.md` with:
- Factory function signatures
- Archetype component lists
- Integration code snippets for GameScene
- Entity lifecycle diagram

---

## Phase 3: Core Game Systems

### Objective
Implement the core game logic as pure ECS systems: Movement, Combat, Status Effects, Health/Death handling.

### Entry Criteria
- [x] Phase 2 complete
- [x] Understanding of current logic in `Unit.ts:163-326`, `CombatSystem.ts`

### Files to Create

```
src/ecs/systems/
├── index.ts
├── MovementSystem.ts       # Unit movement towards enemy castle
├── TargetingSystem.ts      # Find valid attack targets
├── CombatSystem.ts         # Attack execution, damage application
├── HealerSystem.ts         # Support unit healing logic
├── StatusSystem.ts         # Tick down status effect timers
├── HealthSystem.ts         # Death detection, cleanup marking
├── CleanupSystem.ts        # Remove dead entities
└── CooldownSystem.ts       # Tick attack cooldowns
```

### System Implementation Pattern

Each system follows this pattern:
```typescript
import { defineQuery, hasComponent } from 'bitecs';
import type { GameWorld } from '../world';
import { Position, Velocity, Health, Faction, ... } from '../components';

// Define query once at module level
const movingUnits = defineQuery([Position, Velocity, Health]);

export function createMovementSystem(): (world: GameWorld) => GameWorld {
  return function movementSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = movingUnits(world);
    
    for (const eid of entities) {
      // Pure logic - read components, compute, write components
      if (Health.current[eid] <= 0) continue;
      
      const speed = Velocity.baseSpeed[eid];
      const direction = Faction.value[eid] === FACTION.PLAYER ? 1 : -1;
      
      Position.x[eid] += direction * speed * delta;
    }
    
    return world;
  };
}
```

### `MovementSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Position, Velocity, Health, Faction, StatusEffects, 
         Target, Role, EntityType } from '../components';
import { FACTION, ROLE, ENTITY_TYPE } from '../components';
import type { GameWorld } from '../world';

const movableUnits = defineQuery([Position, Velocity, Health, Faction, StatusEffects, EntityType]);

export function createMovementSystem(getCastleX: (faction: number) => number): (world: GameWorld) => GameWorld {
  return function movementSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = movableUnits(world);
    
    for (const eid of entities) {
      // Skip non-units and dead units
      if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
      if (Health.current[eid] <= 0) continue;
      
      // Skip stunned units
      if (StatusEffects.stunTimer[eid] > 0) continue;
      
      // Skip units with a target (they're attacking, not moving)
      if (Target.entityId[eid] !== 0) continue;
      
      // Support units don't move if they have a heal target
      if (Role.value[eid] === ROLE.SUPPORT) continue; // Handled by HealerSystem
      
      // Calculate speed with slow modifier
      let speed = Velocity.baseSpeed[eid];
      if (StatusEffects.slowTimer[eid] > 0) {
        speed *= StatusEffects.slowPower[eid];
      }
      
      // Move towards enemy castle
      const direction = Faction.value[eid] === FACTION.PLAYER ? 1 : -1;
      const enemyCastleX = getCastleX(Faction.value[eid] === FACTION.PLAYER ? FACTION.AI : FACTION.PLAYER);
      const castleAttackRange = 40; // from COMBAT_CONFIG
      
      const stopX = enemyCastleX + (direction === 1 ? -castleAttackRange : castleAttackRange);
      
      Position.x[eid] += direction * speed * delta;
      
      // Clamp to stop position
      if ((direction === 1 && Position.x[eid] > stopX) || 
          (direction === -1 && Position.x[eid] < stopX)) {
        Position.x[eid] = stopX;
      }
    }
    
    return world;
  };
}
```

### `TargetingSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Position, Health, Combat, Faction, Target, Role, EntityType } from '../components';
import { FACTION, ROLE, ENTITY_TYPE } from '../components';
import type { GameWorld } from '../world';

const combatants = defineQuery([Position, Health, Combat, Faction, Target, EntityType]);

export function createTargetingSystem(): (world: GameWorld) => GameWorld {
  return function targetingSystem(world: GameWorld): GameWorld {
    const entities = combatants(world);
    
    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      if (Role.value[eid] === ROLE.SUPPORT) continue; // Healers use different targeting
      
      const myFaction = Faction.value[eid];
      const myX = Position.x[eid];
      const myRange = Combat.range[eid];
      
      let closestEid = 0;
      let closestDist = Infinity;
      
      // Find closest enemy in range
      for (const otherEid of entities) {
        if (otherEid === eid) continue;
        if (Faction.value[otherEid] === myFaction) continue;
        if (Health.current[otherEid] <= 0) continue;
        
        const dist = Math.abs(Position.x[otherEid] - myX);
        if (dist <= myRange && dist < closestDist) {
          closestDist = dist;
          closestEid = otherEid;
        }
      }
      
      Target.entityId[eid] = closestEid;
      Target.distance[eid] = closestEid ? closestDist : Infinity;
    }
    
    return world;
  };
}
```

### `CombatSystem.ts`
```typescript
import { defineQuery, hasComponent } from 'bitecs';
import { Position, Health, Combat, Faction, Target, StatusEffects,
         Animation, UnitConfig } from '../components';
import { ANIM_ACTION } from '../components';
import type { GameWorld } from '../world';

const attackers = defineQuery([Position, Health, Combat, Target, Animation]);

export function createCombatSystem(
  applyStatusEffect: (targetEid: number, statusType: string, duration: number, power: number) => void
): (world: GameWorld) => GameWorld {
  return function combatSystem(world: GameWorld): GameWorld {
    const entities = attackers(world);
    
    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      if (StatusEffects.stunTimer[eid] > 0) continue;
      
      const targetEid = Target.entityId[eid];
      if (targetEid === 0) continue;
      
      // Check cooldown
      if (Combat.cooldown[eid] > 0) continue;
      
      // Check target is still valid
      if (Health.current[targetEid] <= 0) {
        Target.entityId[eid] = 0;
        continue;
      }
      
      // Attack!
      let damage = Combat.damage[eid];
      
      // Apply buff multiplier
      if (StatusEffects.buffTimer[eid] > 0) {
        damage *= StatusEffects.buffPower[eid];
      }
      
      Health.current[targetEid] -= damage;
      Combat.cooldown[eid] = Combat.attackRate[eid];
      Animation.currentAction[eid] = ANIM_ACTION.ATTACK;
      
      // Apply status on hit (if unit has one)
      // Note: Status-on-hit config is looked up via UnitConfig
    }
    
    return world;
  };
}
```

### `StatusSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { StatusEffects, Health } from '../components';
import type { GameWorld } from '../world';

const statusEntities = defineQuery([StatusEffects, Health]);

export function createStatusSystem(): (world: GameWorld) => GameWorld {
  return function statusSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = statusEntities(world);
    
    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      
      // Tick down all status timers
      if (StatusEffects.stunTimer[eid] > 0) {
        StatusEffects.stunTimer[eid] = Math.max(0, StatusEffects.stunTimer[eid] - delta);
      }
      if (StatusEffects.slowTimer[eid] > 0) {
        StatusEffects.slowTimer[eid] = Math.max(0, StatusEffects.slowTimer[eid] - delta);
        if (StatusEffects.slowTimer[eid] === 0) {
          StatusEffects.slowPower[eid] = 1; // Reset slow power
        }
      }
      if (StatusEffects.buffTimer[eid] > 0) {
        StatusEffects.buffTimer[eid] = Math.max(0, StatusEffects.buffTimer[eid] - delta);
        if (StatusEffects.buffTimer[eid] === 0) {
          StatusEffects.buffPower[eid] = 1; // Reset buff power
        }
      }
    }
    
    return world;
  };
}
```

### `CooldownSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Combat, Health } from '../components';
import type { GameWorld } from '../world';

const combatEntities = defineQuery([Combat, Health]);

export function createCooldownSystem(): (world: GameWorld) => GameWorld {
  return function cooldownSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = combatEntities(world);
    
    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      
      if (Combat.cooldown[eid] > 0) {
        Combat.cooldown[eid] = Math.max(0, Combat.cooldown[eid] - delta);
      }
    }
    
    return world;
  };
}
```

### `HealthSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Health, Death, Animation } from '../components';
import { ANIM_ACTION } from '../components';
import type { GameWorld } from '../world';

const healthEntities = defineQuery([Health, Death, Animation]);

export function createHealthSystem(): (world: GameWorld) => GameWorld {
  return function healthSystem(world: GameWorld): GameWorld {
    const now = world.time.now;
    const entities = healthEntities(world);
    
    for (const eid of entities) {
      // Check for death
      if (Health.current[eid] <= 0 && Death.started[eid] === 0) {
        Death.started[eid] = 1;
        Animation.currentAction[eid] = ANIM_ACTION.DEATH;
        Animation.locked[eid] = 1;
        Death.cleanupAt[eid] = now + 500; // Default cleanup time
      }
    }
    
    return world;
  };
}
```

### `CleanupSystem.ts`
```typescript
import { defineQuery, removeEntity } from 'bitecs';
import { Health, Death, Render } from '../components';
import type { GameWorld } from '../world';

const deadEntities = defineQuery([Health, Death, Render]);

export function createCleanupSystem(
  onCleanup: (eid: number) => void
): (world: GameWorld) => GameWorld {
  return function cleanupSystem(world: GameWorld): GameWorld {
    const now = world.time.now;
    const entities = deadEntities(world);
    
    for (const eid of entities) {
      if (Death.started[eid] === 0) continue;
      
      const ready = Death.animDone[eid] === 1 || now >= Death.cleanupAt[eid];
      if (ready) {
        onCleanup(eid);
        removeEntity(world, eid);
      }
    }
    
    return world;
  };
}
```

### System Registration

```typescript
// In GameSceneBridge.ts or system setup file
import { SYSTEM_PRIORITY } from '../constants';

// Register systems in order
scheduler.register('status', createStatusSystem(), SYSTEM_PRIORITY.STATUS);
scheduler.register('cooldown', createCooldownSystem(), SYSTEM_PRIORITY.MOVEMENT - 5);
scheduler.register('targeting', createTargetingSystem(), SYSTEM_PRIORITY.AI);
scheduler.register('movement', createMovementSystem(getCastleX), SYSTEM_PRIORITY.MOVEMENT);
scheduler.register('combat', createCombatSystem(applyStatusEffect), SYSTEM_PRIORITY.COMBAT);
scheduler.register('healer', createHealerSystem(), SYSTEM_PRIORITY.COMBAT + 5);
scheduler.register('health', createHealthSystem(), SYSTEM_PRIORITY.HEALTH);
scheduler.register('cleanup', createCleanupSystem(onCleanup), SYSTEM_PRIORITY.CLEANUP);
```

### Tests to Write

| Test File | Description |
|-----------|-------------|
| `tests/ecs/systems/MovementSystem.test.ts` | Direction, speed, stopping at castle |
| `tests/ecs/systems/TargetingSystem.test.ts` | Range detection, closest target |
| `tests/ecs/systems/CombatSystem.test.ts` | Damage application, cooldown |
| `tests/ecs/systems/StatusSystem.test.ts` | Timer decrement, reset |
| `tests/ecs/systems/HealthSystem.test.ts` | Death detection |
| `tests/ecs/systems/CleanupSystem.test.ts` | Entity removal |

### Exit Criteria
- [x] All 8 systems implemented
- [x] Systems run in correct order
- [x] Combat behaves same as legacy `Unit.update()`
- [x] Status effects work correctly
- [x] Death and cleanup work correctly
- [x] All tests pass

### Execution Notes
- Added core ECS systems (movement, targeting, combat, healer, status, cooldown, health, cleanup) under `src/ecs/systems/` with unit-tick parity.
- Wired system registration in `GameSceneBridge` using `SYSTEM_PRIORITY` ordering.
- Added system tests under `tests/ecs/systems/`.
- Ran `npm test -- tests/ecs/systems/*.test.ts`.

### Documentation Deliverable
Create `docs/ECS_PHASE_3_COMPLETE.md` with:
- System execution order diagram
- Query definitions and what they match
- Data flow diagram showing component reads/writes per system
- Comparison: Legacy vs ECS behavior

---

## Phase 4: Rendering Systems

### Objective
Create pure rendering systems that synchronize Phaser visuals with ECS component state. Rendering systems only READ game state, never modify it.

### Entry Criteria
- [x] Phase 3 complete
- [x] Understanding of current rendering in `Unit.ts:130-157`, `Unit.ts:414-428`

### Files to Create

```
src/ecs/systems/render/
├── index.ts
├── SpriteSystem.ts           # Sync position, flip, visibility
├── HealthBarSystem.ts        # Update health bar width/position
├── StatusDotSystem.ts        # Show/hide status effect indicators
├── AnimationSystem.ts        # Trigger Phaser animations
├── SpawnEffectSystem.ts      # Spawn visual effects
└── FlashEffectSystem.ts      # Damage/heal flash effects
```

### Key Pattern: Pure Rendering

Rendering systems ONLY:
1. Query components for current state
2. Update Phaser objects to match
3. NEVER modify component data

```typescript
// CORRECT: Pure render system
export function createSpriteSystem(renderStore: RenderStore): System {
  return function spriteSystem(world: GameWorld): GameWorld {
    const entities = spriteQuery(world);
    
    for (const eid of entities) {
      const render = renderStore.get(Render.storeIndex[eid]);
      if (!render) continue;
      
      // READ position from component
      const x = Position.x[eid];
      const y = Position.y[eid];
      
      // WRITE to Phaser object (not to component)
      render.container.setPosition(x, y);
    }
    
    return world; // No component modifications
  };
}
```

### `SpriteSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Position, Faction, Render, Health, Death } from '../../components';
import { FACTION } from '../../components';
import type { GameWorld } from '../../world';
import type { RenderStore } from '../../stores/RenderStore';

const spriteEntities = defineQuery([Position, Render, Health]);

export function createSpriteSystem(renderStore: RenderStore): (world: GameWorld) => GameWorld {
  return function spriteSystem(world: GameWorld): GameWorld {
    const entities = spriteEntities(world);
    
    for (const eid of entities) {
      if (Render.storeIndex[eid] === 0) continue;
      
      const renderData = renderStore.get(Render.storeIndex[eid]);
      if (!renderData) continue;
      
      // Sync position
      renderData.container.setPosition(Position.x[eid], Position.y[eid]);
      
      // Sync visibility
      const visible = Render.visible[eid] === 1 && Death.started[eid] === 0;
      renderData.container.setVisible(visible);
      
      // Sync flip based on faction
      if (renderData.mainSprite && Faction.value[eid] === FACTION.AI) {
        renderData.mainSprite.setFlipX(true);
      }
    }
    
    return world;
  };
}
```

### `HealthBarSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Position, Health, Render, Death } from '../../components';
import type { GameWorld } from '../../world';
import type { RenderStore } from '../../stores/RenderStore';

const healthBarEntities = defineQuery([Position, Health, Render]);

export function createHealthBarSystem(
  renderStore: RenderStore,
  healthBarOffsetY: number = -30
): (world: GameWorld) => GameWorld {
  return function healthBarSystem(world: GameWorld): GameWorld {
    const entities = healthBarEntities(world);
    
    for (const eid of entities) {
      if (Render.storeIndex[eid] === 0) continue;
      
      const renderData = renderStore.get(Render.storeIndex[eid]);
      if (!renderData?.healthBar || !renderData?.healthFill) continue;
      
      const x = Position.x[eid];
      const y = Position.y[eid] + healthBarOffsetY;
      const ratio = Math.max(0, Health.current[eid] / Health.max[eid]);
      
      // Position health bar
      renderData.healthBar.setPosition(x, y);
      
      // Size and position fill bar
      const barWidth = renderData.healthBar.width;
      const fillWidth = barWidth * ratio;
      renderData.healthFill.width = fillWidth;
      renderData.healthFill.setPosition(x - (barWidth - fillWidth) / 2, y);
      
      // Hide if dead
      const isDead = Death.started[eid] === 1;
      renderData.healthBar.setVisible(!isDead);
      renderData.healthFill.setVisible(!isDead && ratio > 0.02);
    }
    
    return world;
  };
}
```

### `StatusDotSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { StatusEffects, Render } from '../../components';
import type { GameWorld } from '../../world';
import type { RenderStore } from '../../stores/RenderStore';

const statusEntities = defineQuery([StatusEffects, Render]);

export function createStatusDotSystem(renderStore: RenderStore): (world: GameWorld) => GameWorld {
  return function statusDotSystem(world: GameWorld): GameWorld {
    const entities = statusEntities(world);
    
    for (const eid of entities) {
      if (Render.storeIndex[eid] === 0) continue;
      
      const renderData = renderStore.get(Render.storeIndex[eid]);
      if (!renderData?.statusDots) continue;
      
      const hasStun = StatusEffects.stunTimer[eid] > 0;
      const hasSlow = StatusEffects.slowTimer[eid] > 0;
      const hasBuff = StatusEffects.buffTimer[eid] > 0;
      
      const hasAnyStatus = hasStun || hasSlow || hasBuff;
      renderData.statusDots.setVisible(hasAnyStatus);
      
      if (hasAnyStatus) {
        if (renderData.statusDots.stunDot) {
          renderData.statusDots.stunDot.setVisible(hasStun);
        }
        if (renderData.statusDots.slowDot) {
          renderData.statusDots.slowDot.setVisible(hasSlow);
        }
        if (renderData.statusDots.buffDot) {
          renderData.statusDots.buffDot.setVisible(hasBuff);
        }
      }
    }
    
    return world;
  };
}
```

### `AnimationSystem.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Animation, Render, Death, Health } from '../../components';
import { ANIM_ACTION } from '../../components';
import type { GameWorld } from '../../world';
import type { RenderStore } from '../../stores/RenderStore';

const animatedEntities = defineQuery([Animation, Render]);

const ACTION_TO_ANIM = {
  [ANIM_ACTION.IDLE]: 'idle',
  [ANIM_ACTION.RUN]: 'run',
  [ANIM_ACTION.ATTACK]: 'attack',
  [ANIM_ACTION.HIT]: 'hit',
  [ANIM_ACTION.DEATH]: 'death',
};

export function createAnimationSystem(
  renderStore: RenderStore,
  resolveAnimKey: (eid: number, action: string) => string | null
): (world: GameWorld) => GameWorld {
  
  // Track last action per entity to avoid redundant play calls
  const lastAction = new Map<number, number>();
  
  return function animationSystem(world: GameWorld): GameWorld {
    const now = world.time.now;
    const entities = animatedEntities(world);
    
    for (const eid of entities) {
      if (Render.storeIndex[eid] === 0) continue;
      
      const renderData = renderStore.get(Render.storeIndex[eid]);
      if (!renderData?.mainSprite?.anims) continue;
      
      const action = Animation.currentAction[eid];
      const isLocked = Animation.locked[eid] === 1 && now < Animation.lockUntil[eid];
      
      // Skip if locked (unless death)
      if (isLocked && action !== ANIM_ACTION.DEATH) continue;
      
      // Skip if same action
      if (lastAction.get(eid) === action) continue;
      lastAction.set(eid, action);
      
      // Get animation key
      const actionName = ACTION_TO_ANIM[action] || 'idle';
      const animKey = resolveAnimKey(eid, actionName);
      
      if (animKey) {
        renderData.mainSprite.play(animKey, true);
      }
    }
    
    return world;
  };
}
```

### Visual Entity Creation

When creating ECS entities, also create their Phaser visuals:

```typescript
// src/ecs/factories/createUnitVisuals.ts
export function createUnitVisuals(
  scene: Phaser.Scene,
  eid: number,
  config: UnitTypeConfig,
  side: Side,
  renderStore: RenderStore
): void {
  const size = UNIT_SIZE[config.role] || UNIT_SIZE.default;
  
  // Create container
  const container = scene.add.container(Position.x[eid], Position.y[eid]);
  container.setDepth(4);
  
  // Create main shape or sprite (similar to current Unit constructor)
  let mainSprite: Phaser.GameObjects.Sprite | null = null;
  let mainShape: Phaser.GameObjects.Shape | null = null;
  
  const profile = UNIT_ANIMATION_PROFILES[config.id];
  if (profile?.textureKey && scene.textures.exists(profile.textureKey)) {
    mainSprite = scene.add.sprite(0, 0, profile.textureKey, 0);
    mainSprite.setDisplaySize(size * profile.sizeScale, size * profile.sizeScale);
    mainSprite.setOrigin(profile.originX, profile.originY);
    mainSprite.setFlipX(side === 'ai');
    container.add(mainSprite);
  } else {
    mainShape = scene.add.rectangle(0, 0, size, size, config.color);
    container.add(mainShape);
  }
  
  // Create health bar
  const healthBarOffsetY = profile?.healthBarOffsetY ?? -30;
  const healthBar = scene.add.rectangle(0, healthBarOffsetY, size, 5, 0x2d2f38);
  const healthFill = scene.add.rectangle(0, healthBarOffsetY, size, 5, 0x76c27a);
  healthBar.setDepth(4);
  healthFill.setDepth(4);
  
  // Create status dots
  const statusDots = createStatusDots(scene);
  container.add(statusDots);
  
  // Store in render store
  const storeIndex = renderStore.create({
    container,
    mainShape: mainSprite || mainShape,
    mainSprite,
    healthBar,
    healthFill,
    statusDots,
  });
  
  Render.storeIndex[eid] = storeIndex;
  Render.visible[eid] = 1;
}
```

### Tests to Write

| Test File | Description |
|-----------|-------------|
| `tests/ecs/systems/render/SpriteSystem.test.ts` | Position sync, visibility |
| `tests/ecs/systems/render/HealthBarSystem.test.ts` | Width calculation |
| `tests/ecs/systems/render/AnimationSystem.test.ts` | Animation triggers |

### Exit Criteria
- [x] All render systems implemented
- [x] Render systems never modify component data
- [x] Visual position matches ECS position
- [x] Health bars update correctly
- [x] Status dots show/hide correctly
- [x] Animations play on action change

### Execution Notes
- Added render systems under `src/ecs/systems/render/` with read-only component access.
- Implemented `createUnitVisuals` and RenderStore extensions for status dots and health bar offsets.
- Wired render systems into the scheduler with render-priority ordering.
- Added render system tests under `tests/ecs/systems/render/`.
- Ran `npm test -- tests/ecs/systems/render/*.test.ts`.

### Documentation Deliverable
Create `docs/ECS_PHASE_4_COMPLETE.md` with:
- RenderStore structure
- Visual entity creation process
- Render system order
- Data flow: ECS → Render Store → Phaser

---

## Phase 5: UI & Events Integration

### Objective
Create systems and queries that provide data to the UI layer, and bridge Phaser events to ECS commands.

### Entry Criteria
- [x] Phase 4 complete
- [x] Understanding of current UI state in `GameScene.ts:936-978`, `uiController.ts`

### Files to Create

```
src/ecs/
├── queries/
│   ├── index.ts
│   ├── aliveUnits.ts           # Query for alive units by faction
│   ├── controlPointQueries.ts  # Control point state
│   └── statQueries.ts          # Game statistics
├── bridges/
│   ├── UiStateBridge.ts        # Build UI state from ECS
│   └── EventBridge.ts          # Phaser events → ECS commands
└── systems/
    └── UiStateSystem.ts        # Emit UI state updates
```

### `UiStateBridge.ts`
```typescript
import { defineQuery } from 'bitecs';
import { Position, Health, Faction, EntityType, Presence } from '../components';
import { FACTION, ENTITY_TYPE } from '../components';
import type { GameWorld } from '../world';
import type { UiState } from '../../types';

const allUnits = defineQuery([Position, Health, Faction, EntityType]);

export function buildUiState(world: GameWorld, legacyState: Partial<UiState>): UiState {
  // Query ECS for unit counts
  const entities = allUnits(world);
  
  let playerAliveUnits = 0;
  let aiAliveUnits = 0;
  
  for (const eid of entities) {
    if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
    if (Health.current[eid] <= 0) continue;
    
    if (Faction.value[eid] === FACTION.PLAYER) {
      playerAliveUnits++;
    } else if (Faction.value[eid] === FACTION.AI) {
      aiAliveUnits++;
    }
  }
  
  // Combine ECS data with legacy state (economy, wave, shop)
  return {
    ...legacyState,
    playerAliveUnits,
    aiAliveUnits,
    // Add more ECS-derived stats as systems migrate
  } as UiState;
}
```

### `EventBridge.ts`
```typescript
import type { GameWorld } from '../world';
import type GameScene from '../../scenes/GameScene';

export class EventBridge {
  private scene: GameScene;
  private world: GameWorld;
  
  constructor(scene: GameScene, world: GameWorld) {
    this.scene = scene;
    this.world = world;
  }
  
  setup(): void {
    // Bridge Phaser events to ECS commands
    // For now, events still go to legacy systems
    // This will be expanded as systems migrate
  }
  
  // Command pattern for ECS mutations
  applyDamage(targetEid: number, amount: number): void {
    // Direct component modification (only called from systems)
    import { Health } from '../components';
    Health.current[targetEid] = Math.max(0, Health.current[targetEid] - amount);
  }
  
  applyStatus(targetEid: number, type: 'stun' | 'slow' | 'buff', duration: number, power: number = 1): void {
    import { StatusEffects } from '../components';
    
    if (type === 'stun') {
      StatusEffects.stunTimer[targetEid] = Math.max(StatusEffects.stunTimer[targetEid], duration);
    } else if (type === 'slow') {
      StatusEffects.slowTimer[targetEid] = Math.max(StatusEffects.slowTimer[targetEid], duration);
      StatusEffects.slowPower[targetEid] = power;
    } else if (type === 'buff') {
      StatusEffects.buffTimer[targetEid] = Math.max(StatusEffects.buffTimer[targetEid], duration);
      StatusEffects.buffPower[targetEid] = power;
    }
  }
}
```

### Query Helpers

```typescript
// src/ecs/queries/aliveUnits.ts
import { defineQuery, enterQuery, exitQuery } from 'bitecs';
import { Position, Health, Faction, EntityType } from '../components';
import { FACTION, ENTITY_TYPE } from '../components';

export const aliveUnitsQuery = defineQuery([Position, Health, Faction, EntityType]);

// Enter/exit queries for spawn/death events
export const unitEnterQuery = enterQuery(aliveUnitsQuery);
export const unitExitQuery = exitQuery(aliveUnitsQuery);

export function getAliveUnitsByFaction(world: GameWorld, faction: number): number[] {
  const entities = aliveUnitsQuery(world);
  return entities.filter(eid => 
    (EntityType.value[eid] & ENTITY_TYPE.UNIT) &&
    Health.current[eid] > 0 &&
    Faction.value[eid] === faction
  );
}

export function countAliveUnits(world: GameWorld, faction: number): number {
  return getAliveUnitsByFaction(world, faction).length;
}
```

### Tests to Write

| Test File | Description |
|-----------|-------------|
| `tests/ecs/queries/aliveUnits.test.ts` | Query filtering, enter/exit |
| `tests/ecs/bridges/UiStateBridge.test.ts` | State building |

### Exit Criteria
- [x] UI can query ECS for unit counts
- [x] Enter/exit queries detect spawns/deaths
- [x] EventBridge applies status effects correctly
- [x] UI state combines ECS and legacy data

### Execution Notes
- Added ECS query helpers for alive units, control points, and presence stats.
- Implemented `UiStateBridge`, `EventBridge`, and `UiStateSystem`, wiring UI state emission through the ECS bridge.
- Added query and bridge tests for Phase 5 deliverables.
- Ran `npm test -- tests/ecs/queries/aliveUnits.test.ts tests/ecs/bridges/UiStateBridge.test.ts`.

### Documentation Deliverable
Create `docs/ECS_PHASE_5_COMPLETE.md` with:
- Available queries and their signatures
- EventBridge command list
- UI state structure with ECS fields

---

## Phase 6: Legacy Cleanup & Optimization

### Objective
Remove legacy code paths, optimize ECS queries, and finalize the architecture.

### Entry Criteria
- [x] Phase 5 complete
- [x] All ECS systems working correctly
- [x] Tests pass with ECS-only implementation

### Tasks

1. **Remove Legacy Entity Classes**
   - Delete `Unit.ts` (replace with ECS entity + render data)
   - Simplify `Castle.ts`, `Turret.ts` to pure ECS
   - Update all imports

2. **Remove Legacy Systems**
   - Replace `CombatSystem.ts` with ECS version
   - Update `GameScene.ts` to use ECS-only update loop

3. **Optimize Queries**
   - Use query caching
   - Combine related queries
   - Profile and optimize hot paths

4. **Memory Management**
   - Implement entity pooling for units
   - Clear render store on scene shutdown
   - Profile memory usage

5. **Final Integration**
   - Remove EntityRegistry (no more legacy objects)
   - Simplify GameSceneBridge
   - Update all tests

### Files to Delete
- `src/entities/Unit.ts` (replaced by ECS)
- Legacy system code paths in `src/systems/`

### Files to Modify
- `src/scenes/GameScene.ts` - Simplify to ECS-only
- `src/ecs/bridges/LegacyBridge.ts` - Delete
- `src/ecs/stores/EntityRegistry.ts` - Delete

### Performance Optimizations

```typescript
// Query caching example
const cachedQuery = defineQuery([Position, Health, Faction]);
let cachedResult: number[] = [];
let lastQueryTime = 0;

function getCachedAliveUnits(world: GameWorld): number[] {
  if (world.time.now - lastQueryTime > 16) { // Refresh every frame
    cachedResult = cachedQuery(world);
    lastQueryTime = world.time.now;
  }
  return cachedResult;
}
```

### Exit Criteria
- [x] No legacy entity classes remain
- [x] All systems are ECS-based
- [x] Performance is same or better than legacy
- [x] Memory usage is stable
- [x] All tests pass

### Execution Notes
- Removed legacy entity classes and CombatSystem, replacing GameScene update flow with ECS-only systems.
- Added ECS visuals for castles and turrets, updated Scene logic to use component-driven health and positions.
- Optimized ECS queries with per-frame caching and introduced unit pooling via `UnitPool`.
- Updated control point logic, abilities, and UI state to use ECS data sources.
- Removed LegacyBridge/EntityRegistry and updated tests for ECS-only behavior.
- Ran `npm test -- tests/ecs tests/WaveManager.test.ts tests/ShopManager.test.ts tests/EconomySystem.test.ts tests/GameConfig.test.ts`.

### Documentation Deliverable
Create `docs/ECS_MIGRATION_COMPLETE.md` with:
- Final architecture diagram
- Performance benchmarks (before/after)
- API reference for all public ECS modules
- Migration lessons learned

---

## Appendix A: Component to Legacy Property Mapping

| Legacy Property | ECS Component | Field |
|-----------------|---------------|-------|
| `unit.hp` | `Health` | `current` |
| `unit.maxHp` | `Health` | `max` |
| `unit.dmg` | `Combat` | `damage` |
| `unit.range` | `Combat` | `range` |
| `unit.attackRate` | `Combat` | `attackRate` |
| `unit.attackCooldown` | `Combat` | `cooldown` |
| `unit.healAmount` | `Combat` | `healAmount` |
| `unit.baseSpeed` | `Velocity` | `baseSpeed` |
| `unit.body.x` | `Position` | `x` |
| `unit.body.y` | `Position` | `y` |
| `unit.side` | `Faction` | `value` |
| `unit.role` | `Role` | `value` |
| `unit.status.stun` | `StatusEffects` | `stunTimer` |
| `unit.status.slow` | `StatusEffects` | `slowTimer` |
| `unit.status.slowPower` | `StatusEffects` | `slowPower` |
| `unit.status.buff` | `StatusEffects` | `buffTimer` |
| `unit.status.buffPower` | `StatusEffects` | `buffPower` |
| `unit.presenceMult` | `Presence` | `multiplier` |
| `unit.deathStarted` | `Death` | `started` |
| `unit.deathAnimDone` | `Death` | `animDone` |
| `unit.deathCleanupAt` | `Death` | `cleanupAt` |

## Appendix B: System Execution Order

```
Frame Start
    │
    ▼
┌─────────────────┐
│ StatusSystem    │ Priority: 40 - Tick down status timers
└────────┬────────┘
         ▼
┌─────────────────┐
│ CooldownSystem  │ Priority: 15 - Tick attack cooldowns
└────────┬────────┘
         ▼
┌─────────────────┐
│ TargetingSystem │ Priority: 10 - Find attack targets
└────────┬────────┘
         ▼
┌─────────────────┐
│ HealerSystem    │ Priority: 25 - Support unit healing
└────────┬────────┘
         ▼
┌─────────────────┐
│ MovementSystem  │ Priority: 20 - Move towards enemy
└────────┬────────┘
         ▼
┌─────────────────┐
│ CombatSystem    │ Priority: 30 - Apply damage
└────────┬────────┘
         ▼
┌─────────────────┐
│ HealthSystem    │ Priority: 50 - Detect deaths
└────────┬────────┘
         ▼
┌─────────────────┐
│ CleanupSystem   │ Priority: 60 - Remove dead entities
└────────┬────────┘
         ▼
┌─────────────────┐
│ SpriteSystem    │ Priority: 100 - Sync positions
└────────┬────────┘
         ▼
┌─────────────────┐
│ HealthBarSystem │ Priority: 101 - Update health bars
└────────┬────────┘
         ▼
┌─────────────────┐
│ StatusDotSystem │ Priority: 102 - Show status indicators
└────────┬────────┘
         ▼
┌─────────────────┐
│ AnimationSystem │ Priority: 103 - Trigger animations
└────────┴────────┘
         │
         ▼
    Frame End
```

## Appendix C: Agent Execution Notes

### For Each Phase

1. **Read the Entry Criteria** - Ensure all prerequisites are met
2. **Read the Previous Phase Doc** - Understand the interfaces provided
3. **Follow the File Structure** - Create files in specified locations
4. **Write Tests First** - TDD approach recommended
5. **Update Documentation** - Create the exit documentation

### Context Requirements

| Phase | Required Context |
|-------|------------------|
| 0 | `types.ts`, `package.json` |
| 1 | Phase 0 docs, `types.ts`, `Unit.ts:47-77` |
| 2 | Phase 1 docs, `GameScene.ts:655-679` |
| 3 | Phase 2 docs, `Unit.ts:163-326`, `CombatSystem.ts` |
| 4 | Phase 3 docs, `Unit.ts:130-157`, `Unit.ts:414-428` |
| 5 | Phase 4 docs, `GameScene.ts:936-978`, `uiController.ts` |
| 6 | All previous phase docs, full codebase access |

### Verification Commands

```bash
# Run ECS tests
npm test -- --grep "ecs"

# Run full test suite
npm test

# Build to check types
npm run build

# Run the game to verify visually
npm run dev
```
