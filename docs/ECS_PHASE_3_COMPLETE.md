# ECS Phase 3 Complete

## System Execution Order

```
AI: Targeting (priority 10)
Cooldown (priority 15)
Movement (priority 20)
Combat (priority 30)
Healer (priority 35)
Status (priority 40)
Health (priority 50)
Cleanup (priority 60)
```

## Query Definitions

| System | Query | Matches |
| --- | --- | --- |
| MovementSystem | `Position`, `Velocity`, `Health`, `Faction`, `StatusEffects`, `Target`, `Role`, `EntityType`, `Animation` | Living, non-support units that can move and animate |
| TargetingSystem | `Position`, `Health`, `Combat`, `Faction`, `Target`, `Role`, `EntityType` | Living, non-support units that can pick targets |
| CombatSystem | `Position`, `Health`, `Combat`, `Faction`, `Target`, `StatusEffects`, `Animation`, `Role`, `EntityType`, `UnitConfig` | Living, non-support units that can attack and apply status-on-hit |
| HealerSystem | `Position`, `Velocity`, `Health`, `Combat`, `Faction`, `Role`, `StatusEffects`, `Animation`, `EntityType` | Support units that can heal or move |
| StatusSystem | `StatusEffects`, `Health` | Living entities with active status timers |
| CooldownSystem | `Combat`, `Health` | Living entities with attack cooldowns |
| HealthSystem | `Health`, `Death`, `Animation` | Entities that can die and trigger cleanup timing |
| CleanupSystem | `Health`, `Death`, `Render` | Dead entities eligible for removal |

## Data Flow (Reads/Writes)

- MovementSystem: reads `Velocity`, `StatusEffects`, `Faction`, `Target` → writes `Position`, `Animation.currentAction`
- TargetingSystem: reads `Position`, `Combat.range`, `Faction`, `Health` → writes `Target.entityId`, `Target.distance`
- CombatSystem: reads `Target`, `Combat`, `StatusEffects`, `Faction`, `UnitConfig` → writes `Health`, `Combat.cooldown`, `Animation.currentAction`, `StatusEffects` (on target)
- HealerSystem: reads `Combat`, `Health`, `Faction`, `StatusEffects` → writes `Health` (ally), `Combat.cooldown`, `Position`, `Animation.currentAction`
- StatusSystem: reads `StatusEffects`, `Health` → writes `StatusEffects` timers and power resets
- CooldownSystem: reads `Combat`, `Health` → writes `Combat.cooldown`
- HealthSystem: reads `Health` → writes `Death`, `Animation` lock state
- CleanupSystem: reads `Death`, `Render` → removes entity and triggers cleanup hook

## Legacy vs ECS Behavior

- `Unit.update()` cooldown and status ticks map to `CooldownSystem` + `StatusSystem`.
- `findTarget()` maps to `TargetingSystem` with closest-enemy selection.
- `move()` maps to `MovementSystem` and `HealerSystem` (support units).
- `takeDamage()` and death handling map to `CombatSystem` damage + `HealthSystem` death marking.
- Support healing logic maps to `HealerSystem` with missing-HP prioritization.
