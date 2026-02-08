# Cliffside Castle Conquest - AI Agent Guide

## Project Overview

1v1 lane-based strategy game. Two castles on cliffs connected by a bridge. Spawn troops, control zones, destroy enemy castle.

**Tech:** Phaser 3 + bitECS + Vite + TypeScript

**Architecture:** Deterministic simulation (50ms ticks) with presentation layer separation.

---

## Quick Commands

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build
npm run test         # Run tests
npm run typecheck    # Type check
npm run lint:fix     # Fix linting
npm run format       # Format code
```

---

## Documentation Index

Load specific docs as needed to avoid context overload:

| Topic | File | When to Read |
|-------|------|--------------|
| System design | `docs/architecture.md` | Understanding data flow, scene lifecycle |
| Determinism | `docs/simulation.md` | Working with SimClock, RNG, DamagePipeline |
| ECS | `docs/ecs.md` | Adding components, systems, queries |
| Game mechanics | `docs/game-mechanics.md` | Units, combat, economy, waves |
| AI opponent | `docs/ai-system.md` | Modifying AI behavior |
| Setup | `docs/development.md` | Build, test, add features |
| Pitfalls | `docs/GOTCHAS.md` | Before making changes |

---

## When Working On

### Adding/Modifying Units
1. Read `docs/game-mechanics.md` (unit reference)
2. Read `docs/ecs.md` (component structure)
3. Check `src/data/units/guard.ts` as template
4. Add to `src/data/units.ts`

### Combat/Damage Changes
1. Read `docs/simulation.md` (DamagePipeline section)
2. Check `src/sim/DamagePipeline.ts`
3. Never mutate `Health.current` directly

### ECS Components/Systems
1. Read `docs/ecs.md`
2. Check `src/ecs/components/Position.ts` (component pattern)
3. Check `src/ecs/systems/TargetingSystem.ts` (system pattern)
4. Register in `src/ecs/bridges/GameSceneBridge.ts`

### AI Behavior
1. Read `docs/ai-system.md`
2. Modify `src/systems/AIController.ts`

### Sprite/Animation Issues
1. Read `docs/GOTCHAS.md` (sprite sheet section)
2. All unit sprites: 768x448 frames, 4-column grid (fixed structure)

---

## Canonical Examples

| Concept | Reference File |
|---------|---------------|
| Component | `src/ecs/components/Position.ts` |
| System | `src/ecs/systems/TargetingSystem.ts` |
| Unit config | `src/data/units/guard.ts` |
| Factory | `src/ecs/factories/createUnit.ts` |
| Query | `src/ecs/queries/aliveUnits.ts` |

---

## Critical Rules

### Determinism (MUST follow in `src/sim` and `src/ecs`)
- **NO** `Math.random()` - use `ctx.world.sim.rng`
- **NO** `Date.now()` or `performance.now()` - use tick-based timing
- **NO** `setTimeout` / `setInterval` - use SimClock
- **ALL** HP changes through `DamagePipeline`

### Code Quality
- Run `npm run lint:fix && npm run format` before commits
- Run `npm run typecheck` to verify types
- Run `npm run test` to verify behavior

---

## Changelog Requirement

**Every git commit MUST include a changelog entry.**

Before committing:
1. Make your code changes
2. Update `CHANGELOG.md` under `## [Unreleased]`
3. Use these categories:
   - **Added** - New features
   - **Changed** - Changes to existing functionality
   - **Fixed** - Bug fixes
   - **Removed** - Removed features
4. Stage both code and CHANGELOG.md
5. Commit with descriptive message

Example:
```markdown
## [Unreleased]

### Added
- New unit type: Berserker with rage mechanic

### Fixed
- Healer units now correctly prioritize lowest HP ally
```

---

## Project Structure

```
src/
├── config/         # Game configuration
├── data/units/     # Unit type definitions
├── ecs/
│   ├── components/ # ECS components
│   ├── systems/    # ECS systems
│   ├── bridges/    # Scene-ECS integration
│   └── factories/  # Entity creation
├── scenes/         # Phaser scenes
├── sim/            # Deterministic simulation
└── systems/        # High-level game systems (Economy, Shop, Wave, AI)
```
