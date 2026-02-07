# ECS Phase 5 Complete

## Queries

- `aliveUnitsQuery`, `countAliveUnits(world, faction)`, `getAliveUnitsByFaction(world, faction)`
- `controlPointsQuery`, `getControlPointOwners(world)`, `countControlPointsByOwner(world, owner)`
- `presenceTotalsQuery`, `getPresenceTotals(world)`

## Bridges

- `UiStateBridge.buildState(legacyState)` merges legacy UI state with ECS stats.
- `EventBridge` listens for `ecs-apply-damage` and `ecs-apply-status` to mutate ECS components.

## UiState ECS Fields

- `playerAliveUnits`, `aiAliveUnits`
- `playerPresence`, `aiPresence`

## Systems

- `createUiStateSystem({ buildLegacyState, emit })` emits merged UI state via `UiStateBridge`.

## Tests

- `tests/ecs/queries/aliveUnits.test.ts`
- `tests/ecs/bridges/UiStateBridge.test.ts`
