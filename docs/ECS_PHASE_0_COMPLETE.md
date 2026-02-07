# ECS Phase 0 Complete

## Created Files
- `src/ecs/index.ts`
- `src/ecs/world.ts`
- `src/ecs/types.ts`
- `src/ecs/constants.ts`
- `src/ecs/components/index.ts`
- `src/ecs/systems/index.ts`
- `src/ecs/systems/SystemScheduler.ts`
- `src/ecs/queries/index.ts`
- `src/ecs/archetypes/index.ts`
- `src/ecs/bridges/LegacyBridge.ts`
- `tests/ecs/world.test.ts`
- `tests/ecs/SystemScheduler.test.ts`

## API

### `createGameWorld()`
Creates a new ECS world with a time tracker and an optional Phaser scene reference.

```ts
import { createGameWorld } from "./ecs/world";

const world = createGameWorld();
```

### `SystemScheduler`
Registers systems, sorts them by priority on first run, and executes enabled systems in order.

```ts
import { SystemScheduler } from "./ecs/systems/SystemScheduler";
import { SYSTEM_PRIORITY } from "./ecs/constants";

const scheduler = new SystemScheduler();
scheduler.register("movement", (world) => world, SYSTEM_PRIORITY.MOVEMENT);
scheduler.run(world);
```

## Example Usage

```ts
import { createGameWorld, updateWorldTime } from "./ecs/world";
import { SystemScheduler } from "./ecs/systems/SystemScheduler";

const world = createGameWorld();
const scheduler = new SystemScheduler();

function update(delta: number, now: number) {
  updateWorldTime(world, delta, now);
  scheduler.run(world);
}
```

## Known Limitations / Decisions
- `LegacyBridge` is a stub and does not yet sync entities.
- `components`, `queries`, and `archetypes` are placeholder barrels for Phase 1+.
- `bitecs` install failed locally due to eslint peer dependency conflicts; tests require the package to be installed.
