# Development

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
git clone <repository>
cd cliffside
npm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Production build to dist/ |
| `npm run preview` | Preview production build |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |

## Dev Mode

Add `?dev` to the URL to skip the title screen and go directly to gameplay.

Press `T` during gameplay to toggle time scale (fast-forward).

---

## Project Structure

```
src/
├── main.ts              # Entry point
├── types.ts             # Global type definitions
├── config/              # Game configuration
├── data/                # Unit/ability definitions
│   └── units/           # Individual unit configs
├── ecs/                 # Entity Component System
│   ├── components/      # ECS components
│   ├── systems/         # ECS systems
│   ├── archetypes/      # Entity templates
│   ├── bridges/         # Scene-ECS integration
│   ├── factories/       # Entity creation
│   ├── queries/         # Query definitions
│   ├── spatial/         # Spatial hashing
│   └── stores/          # Runtime stores
├── scenes/              # Phaser scenes
├── sim/                 # Deterministic simulation
├── systems/             # High-level game systems
├── ui/                  # UI components
└── utils/               # Utility functions

tests/
├── ecs/                 # ECS tests
└── sim/                 # Simulation tests

public/assets/
├── environment/         # Background assets
├── structures/          # Castle/turret assets
├── ui/                  # UI markers
└── units/               # Unit spritesheets
```

---

## Testing

Tests use Vitest and are located in `tests/`.

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
```

### Test Patterns

- ECS component tests verify data storage
- System tests verify query and mutation behavior
- Simulation tests verify determinism

---

## Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode

Run before committing:
```bash
npm run lint:fix && npm run format
```

---

## Adding a New Unit

1. Create config in `src/data/units/`:
```typescript
export const myUnit: UnitTypeConfig = {
  id: "myUnit",
  name: "My Unit",
  summary: "Description",
  role: "damage",
  tier: 1,
  stageMin: 0,
  hp: 100,
  damage: 20,
  range: 150,
  speed: 30,
  attackRate: 1.0,
  cost: 4,
  presence: 0.8,
  shopWeight: 1.0,
  tags: ["damage", "ranged"],
  sprite: "my_unit"
};
```

2. Add to `src/data/units.ts`:
```typescript
import { myUnit } from "./units/myUnit";
export const UNIT_TYPES = { ..., myUnit };
```

3. Add sprite assets to `public/assets/units/`

4. Register animations in `PreloadScene.ts` if needed

---

## Adding a New System

1. Create system in `src/ecs/systems/`:
```typescript
export function createMySystem() {
  const query = defineQuery([Position, Health]);
  
  return (world: GameWorld) => {
    const entities = query(world);
    for (const eid of entities) {
      // Process entity
    }
    return world;
  };
}
```

2. Register in `GameSceneBridge.ts`:
```typescript
scheduler.register("mySystem", createMySystem(), PRIORITY);
```

---

## Asset Guidelines

See `public/assets/*/README.md` for asset requirements.

### Sprite Sheets
- Grid: 4 columns
- Frame size: 768x448px
- Alpha transparency (no chroma keying)

See [GOTCHAS.md](./GOTCHAS.md) for sprite sheet pitfalls.

---

## Debugging

### Browser DevTools
- Phaser debug: `game.config.physics.arcade.debug = true`
- ECS state: Access via `window.game.scene.scenes[0].bridge.world`

### Logging
- Wave events logged to console
- Combat events available via SimEventBus

---

## Build

```bash
npm run build
```

Output goes to `dist/`. Deploy contents of `dist/` to any static host.
