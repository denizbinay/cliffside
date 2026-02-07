# ECS Migration Complete

## Final Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                               ECS WORLD                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ Components: Position, Velocity, Health, Combat, StatusEffects, Faction,   │
│ Role, Target, Animation, Render, UnitConfig, Presence, Death, EntityType  │
├──────────────────────────────────────────────────────────────────────────┤
│ Systems: Status → Cooldown → Targeting → Movement → Combat → Healer →     │
│ Health → Cleanup → Render (Sprite/HealthBar/Status/Animation/FX)           │
├──────────────────────────────────────────────────────────────────────────┤
│ Queries: AliveUnits, ControlPoints, PresenceTotals                         │
└──────────────────────────────────────────────────────────────────────────┘
```

## Performance Benchmarks (Before/After)

- Baseline: Legacy OOP loop (Unit/CombatSystem) with per-frame allocations.
- After: ECS systems with cached queries and pooled units.
- Notes: Benchmarks not captured in this run; caching and pooling are expected to reduce per-frame query churn and GC pressure.

## Public ECS API Reference

- `src/ecs/world.ts`: `createGameWorld`, `updateWorldTime`, `resetGameWorld`
- `src/ecs/constants.ts`: `SYSTEM_PRIORITY`, `ENTITY_TYPE`, `MAX_ENTITIES`
- `src/ecs/components/*`: component schemas and enums (`FACTION`, `ROLE`, `ANIM_ACTION`)
- `src/ecs/factories/*`: `createUnit`, `createCastle`, `createTurret`, `createControlPoint`, `createUnitVisuals`, `createCastleVisuals`, `createTurretVisuals`
- `src/ecs/queries/*`: `countAliveUnits`, `getAliveUnitsByFaction`, `getControlPointOwners`, `getPresenceTotals`
- `src/ecs/systems/*`: core gameplay systems and render systems
- `src/ecs/bridges/GameSceneBridge`: world lifecycle, scheduler, UI/event bridges
- `src/ecs/stores/*`: `RenderStore`, `ConfigStore`, `UnitPool`

## Migration Lessons Learned

- Keep ECS queries hot-path friendly: cache per-frame results and avoid redundant scans.
- Centralize visuals in RenderStore for clean ECS/Phaser separation.
- Pool high-churn entities to reduce allocations and deletion overhead.
- Avoid mixed legacy/ECS logic; a single ECS loop improves consistency and testability.
