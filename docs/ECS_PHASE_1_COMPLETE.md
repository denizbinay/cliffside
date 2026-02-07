# ECS Phase 1 Complete

## Component Schema Reference

| Component | Fields |
| --- | --- |
| Position | `x: f32`, `y: f32` |
| Velocity | `vx: f32`, `vy: f32`, `baseSpeed: f32` |
| Health | `current: f32`, `max: f32` |
| Combat | `damage: f32`, `range: f32`, `attackRate: f32`, `cooldown: f32`, `healAmount: f32` |
| StatusEffects | `stunTimer: f32`, `slowTimer: f32`, `slowPower: f32`, `buffTimer: f32`, `buffPower: f32` |
| Faction | `value: ui8` |
| Role | `value: ui8` |
| Target | `entityId: eid`, `distance: f32` |
| Animation | `currentAction: ui8`, `locked: ui8`, `lockUntil: f32` |
| Render | `storeIndex: ui32`, `visible: ui8`, `depth: ui8` |
| UnitConfig | `typeIndex: ui16`, `size: f32`, `color: ui32` |
| Presence | `baseValue: f32`, `multiplier: f32` |
| Death | `started: ui8`, `animDone: ui8`, `cleanupAt: f32` |
| EntityType | `value: ui8` |

## Enum Values

```ts
export const FACTION = {
  NEUTRAL: 0,
  PLAYER: 1,
  AI: 2
} as const;

export const ROLE = {
  NONE: 0,
  FRONTLINE: 1,
  DAMAGE: 2,
  SUPPORT: 3,
  DISRUPTOR: 4
} as const;

export const ANIM_ACTION = {
  IDLE: 0,
  RUN: 1,
  ATTACK: 2,
  HIT: 3,
  DEATH: 4
} as const;
```

## RenderStore API

```ts
class RenderStore {
  create(entry: RenderStoreEntry): number;
  get(index: number): RenderStoreEntry | undefined;
  delete(index: number): void;
  clear(): void;
}
```

Notes:
- `Render.storeIndex` stores the index returned by `create`.
- `delete` and `clear` destroy container, health bar, health fill, and status dot objects.

## Legacy Property Mapping

| Legacy Property | ECS Component | Notes |
| --- | --- | --- |
| Unit.side | `Faction.value` | `player` -> `FACTION.PLAYER`, `ai` -> `FACTION.AI` |
| Unit.role | `Role.value` | Map `UnitRole` to `ROLE` |
| Unit.maxHp / Unit.hp | `Health.max` / `Health.current` | -- |
| Unit.dmg / Unit.range / Unit.attackRate / Unit.attackCooldown / Unit.healAmount | `Combat.*` | `attackCooldown` -> `Combat.cooldown` |
| Unit.baseSpeed | `Velocity.baseSpeed` | -- |
| Unit.status.stun / slow / slowPower / buff / buffPower | `StatusEffects.*` | Timers and multipliers |
| Unit.currentUnitAnim / unitAnimLocked / actionAnimLockedUntil | `Animation.*` | `currentAction`, `locked`, `lockUntil` |
| Unit.deathStarted / deathAnimDone / deathCleanupAt | `Death.*` | -- |
| Unit.config / size / baseColor | `UnitConfig.*` | Store indices and computed size/color |
| Unit.presenceMult | `Presence.multiplier` | Base from config goes to `Presence.baseValue` |
| Unit.body / mainShape / statusDots / healthBar / healthFill | `Render.storeIndex` + RenderStore entry | External Phaser objects |
| Castle.side | `Faction.value` | -- |
| Castle.x / Castle.y | `Position.x` / `Position.y` | -- |
| Castle.maxHp / Castle.hp | `Health.max` / `Health.current` | -- |
| Castle.base / tower / banner / hpBar* | `Render.storeIndex` + RenderStore entry | Render-only data |
| Turret.side | `Faction.value` | -- |
| Turret.x / Turret.y | `Position.x` / `Position.y` | -- |
| Turret.range / Turret.dmg / Turret.attackRate / Turret.attackCooldown | `Combat.*` | `attackCooldown` -> `Combat.cooldown` |
| Turret.status.stun | `StatusEffects.stunTimer` | -- |
| Turret.base / healthBar* | `Render.storeIndex` + RenderStore entry | Render-only data |
| Turret.earlyWaveShieldWaves / earlyWaveDamageMult / earlyWaveMinHpRatio | Future component or config store | Deferred to Phase 2+ |
