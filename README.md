# Cliffside Castle Conquest

A 1v1 lane-based strategy game where two castles clash on a bridge. Built with Phaser 3 and bitECS for deterministic multiplayer.

## Development

```bash
npm install
npm run dev      # Start dev server at localhost:5173
npm run build    # Production build to dist/
npm run test     # Run test suite
```

Add `?dev` to URL to skip title screen.

## Documentation

- `AGENT.md` - AI-assisted development guide
- `docs/` - Technical documentation
  - `architecture.md` - System design
  - `simulation.md` - Determinism rules
  - `ecs.md` - Entity Component System
  - `game-mechanics.md` - Units, combat, economy
  - `ai-system.md` - AI opponent
  - `development.md` - Setup and contributing
  - `GOTCHAS.md` - Common pitfalls
