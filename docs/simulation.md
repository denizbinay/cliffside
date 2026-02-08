# Simulation

The simulation layer (`src/sim/`) is the deterministic core of Cliffside Castle Conquest. It enforces strict rules to ensure that any given initial state (seed) and sequence of inputs will produce identical game states, regardless of the machine or frame rate.

## Why Determinism Matters

- **Fairness**: All players experience identical game logic
- **Replays**: Record and playback matches perfectly
- **Network Prediction**: Client-side prediction with server reconciliation
- **Testing**: Verify simulation correctness across versions

---

## Core Rules

### 1. Fixed Timestep
- Simulation advances in **fixed 50ms ticks**
- All durations and cooldowns are measured in ticks or accumulated milliseconds
- Frame rate variations do not affect game logic

### 2. No Wall-Clock Time
**FORBIDDEN** in `src/sim` and `src/ecs`:
- `Date.now()`
- `performance.now()`
- `Phaser.Time` for logic calculations
- `setTimeout` / `setInterval` for gameplay delays

### 3. Seeded RNG Only
- All gameplay probabilities use `ctx.world.sim.rng`
- `Math.random()` is **strictly forbidden** in simulation code

### 4. Command Pattern
- Player actions are serialized as Commands (Cast, Move, Buy)
- Commands are queued and processed at tick start
- Enables replay and network synchronization

### 5. Presentation Decoupling
- `GameScene` and UI are **read-only** observers
- State mutations occur **only** within ECS systems or Sim functions
- Events flow from Sim to Presentation via `SimEventBus`

---

## SimClock

**File:** `src/sim/SimClock.ts`

Manages deterministic time progression with frame-independent tick advancement.

```typescript
class SimClock {
  readonly stepMs: number;     // Fixed timestep (default: 50ms)
  readonly maxFrameMs: number; // Cap to prevent spiral of death
  timeScale: number;           // Speed multiplier (1.0 = normal)
  
  get elapsedMs(): number;     // Total simulation time
  get stepSeconds(): number;   // stepMs / 1000
  
  pushFrame(deltaMs: number): void;  // Add frame time
  consumeTick(): boolean;            // Consume one tick if available
  reset(): void;
}
```

**Usage:**
```typescript
clock.pushFrame(frameDelta);
while (clock.consumeTick()) {
  runSimulationTick(clock.stepSeconds);
}
```

---

## Seeded RNG

**File:** `src/sim/Rng.ts`

Provides deterministic pseudo-random numbers using xorshift32.

```typescript
class Rng {
  constructor(seed: number);
  nextUint32(): number;  // 0 to 0xFFFFFFFF
  nextFloat(): number;   // 0 to 1 (exclusive)
  reseed(seed: number): void;
}
```

**Correct usage:**
```typescript
const crit = ctx.world.sim.rng.nextFloat() < critChance;
```

**FORBIDDEN:**
```typescript
const bad = Math.random() < critChance; // BREAKS DETERMINISM
```

---

## DamagePipeline

**File:** `src/sim/DamagePipeline.ts`

Central transaction system for ALL HP mutations. Routes damage and healing through staged hooks.

### Damage Stages
1. `preMitigation` - Crit multipliers, damage amplification
2. `mitigation` - Armor, shields, damage reduction
3. `postDamage` - Lifesteal, thorns, on-hit procs
4. `onKill` - Resets, bounties, on-kill buffs

### Heal Stages
1. `preHeal` - Anti-heal reduction, heal amplification
2. `postHeal` - Overheal shield, post-heal procs

### Damage Types
```typescript
DAMAGE_TYPE.PHYSICAL  // Mitigated by Armor
DAMAGE_TYPE.MAGIC     // Mitigated by Magic Resist
DAMAGE_TYPE.TRUE      // Ignores Armor/MR
DAMAGE_TYPE.PURE      // Ignores everything
```

### Usage
```typescript
// Register hook at initialization
pipeline.onDamage("postDamage", (ctx) => {
  const lifesteal = getStat(ctx.sourceEid, STAT.LIFESTEAL, 0);
  if (lifesteal > 0) {
    pipeline.applyHeal(ctx.world, ctx.sourceEid, ctx.sourceEid, 
      ctx.amount * lifesteal, ["lifesteal"]);
  }
});

// Apply damage through pipeline
const result = pipeline.applyDamage(world, attacker, target, 100, 
  DAMAGE_TYPE.PHYSICAL, DAMAGE_FLAGS.CRIT);
```

---

## ActionSystem

**File:** `src/sim/ActionSystem.ts`

State machine for ability casting with phases, interrupts, and cooldowns.

### Action States
```
IDLE -> WINDUP -> RELEASE -> CHANNEL -> RECOVERY -> IDLE
```

### Interrupt Types
- **Hard CC:** Stun, Suppress, Knockup, Charm, Fear, Taunt
- **Soft CC:** Silence, Disarm, Root, Blind
- **Displacement:** Knockup, Knockback, Pull

### Usage
```typescript
const result = startAction(entityId, abilityDef, targetId, currentTick);
if (!result.success) {
  console.log(`Failed: ${result.reason}`);
}
```

---

## EffectSystem

**File:** `src/sim/EffectSystem.ts`

Generic, data-driven effect system with handler registration.

### Effect Kinds
- **Damage/Heal:** DAMAGE_FLAT, DAMAGE_PERCENT, HEAL_FLAT, HEAL_PERCENT
- **Status:** APPLY_STUN, APPLY_SLOW, APPLY_BUFF, APPLY_SHIELD
- **Movement:** PUSHBACK, PULL, DASH, BLINK
- **Misc:** SPAWN_ENTITY, TRIGGER_ABILITY

### Lifecycle Stages
- `ON_APPLY` - When effect is first applied
- `ON_TICK` - Each simulation tick while active
- `ON_EXPIRE` - When duration ends

---

## Movement

**File:** `src/sim/Movement.ts`

Handles lane movement, dashes, and displacements with priority resolution.

### Movement Priorities

Higher priority movements override lower ones. Priority order (lowest to highest):

1. **LANE** - Basic movement
2. **DASH** - Player-initiated dash
3. **CHARGE** - Charging ability
4. **PULL** - Being pulled
5. **KNOCKBACK** - Being knocked back
6. **BLINK** - Instant teleport

See `src/sim/Movement.ts` for current priority values.

---

## Replay System

**File:** `src/sim/Replay.ts`

Records and replays game sessions for verification and debugging.

### Command Types
```typescript
SPAWN_UNIT, MOVE_UNIT, STOP_UNIT,
CAST_ABILITY, CANCEL_CAST,
PURCHASE, SELL, REROLL,
START_WAVE, DRAFT_UNIT, SET_STANCE
```

### Snapshots
```typescript
interface StateSnapshot {
  tick: number;
  hash: number;        // FNV-1a hash of component arrays
  rngState: number;
  entityCount: number;
}
```

---

## SimEventBus

**File:** `src/sim/SimEventBus.ts`

Decoupled event system for UI/audio to react to gameplay.

### Event Types
- **Combat:** ATTACK_START, DAMAGE_DEALT, CRIT, KILL
- **Abilities:** CAST_START, CAST_RELEASE, CAST_CANCEL
- **Status:** STATUS_APPLY, STATUS_EXPIRE, SHIELD_BREAK
- **Movement:** DASH_START, KNOCKBACK, BLINK
- **Lifecycle:** SPAWN, DEATH, WAVE_START, GAME_END

---

## Developer Guidelines

### Patterns to Follow
```typescript
// 1. Use world RNG for randomness
const didCrit = ctx.world.sim.rng.nextFloat() < critChance;

// 2. Route ALL HP changes through pipeline
pipeline.applyDamage(world, source, target, amount, damageType);

// 3. Use tick-based timers
action.stateTimer -= deltaSeconds;

// 4. Emit events for UI
emitCombat(world, SIM_EVENT.DAMAGE_DEALT, source, target, damage);

// 5. Commands for player input
commandQueue.push({
  type: COMMAND_TYPE.CAST_ABILITY,
  tick: currentTick,
  playerId: player.id,
  payload: { abilityId: "fireball", targetEid: enemy }
});
```

### Anti-Patterns to Avoid
```typescript
// FORBIDDEN: Wall-clock time
const now = Date.now();

// FORBIDDEN: Global random
const x = Math.random();

// FORBIDDEN: Direct HP mutation
Health.current[eid] -= 50;  // Bypasses pipeline

// FORBIDDEN: Frame-dependent logic
if (frameCount % 60 === 0) doSomething();  // Use tick count
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/sim/SimClock.ts` | Fixed timestep timing |
| `src/sim/Rng.ts` | Seeded random numbers |
| `src/sim/DamagePipeline.ts` | Damage/heal processing |
| `src/sim/ActionSystem.ts` | Ability state machine |
| `src/sim/EffectSystem.ts` | Buff/debuff system |
| `src/sim/Movement.ts` | Movement with priorities |
| `src/sim/Replay.ts` | Command recording/playback |
| `src/sim/SimEventBus.ts` | Simulation events |
| `src/sim/Stats.ts` | Stat calculation |
| `src/sim/Targeting.ts` | Target eligibility |
