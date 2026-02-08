# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Dual bridge sprite system: two independent bridge sprites for wider coverage
- Lane bounds system: explicit startX, endX, y for defining unit lane boundaries
- Control point bounds: explicit startX, endX, y for control point area
- Absolute turret positioning: direct x, y coordinates instead of offsets
- Read-only mirrored markers in LayoutDevTool for AI-side elements
- LayoutDevTool handles: Bridge 1, Bridge 2, Lane Start, Lane End, Control Start, Control End, Turret
- Documentation suite: AGENT.md, architecture, simulation, ecs, game-mechanics, ai-system, development guides
- CHANGELOG.md with Keep a Changelog format

### Changed
- `bridgeSprite` split into `bridgeSprite1` and `bridgeSprite2` (independent positions/scales)
- Turret positioning changed from sideInset/yOffset to absolute x/y coordinates
- Lane positioning changed from spawnInset/laneY to explicit startX/endX/y bounds
- Control points now use explicit startX/endX/y bounds instead of bridge-relative positioning
- Mirrored elements (lane, turret) show read-only markers for AI side
- Spawn AI, lane end, and control end now mirror player-side positions
- Default layout profile updated with new bridge/turret/spawn/lane/control values
- Layout storage key bumped to V8 (invalidates old saved layouts)
- README.md simplified to concise project overview with doc links
- GOTCHAS.md expanded with determinism rules section
- Docs follow "concepts + file references" pattern (no duplicated config values)

### Removed
- `LayoutBridgeProfile` type (topY, plankOffsetY, thickness, showControlFx)
- `LayoutUnitsProfile` type (replaced by `LayoutLaneProfile`)
- Bridge Start and Bridge H handles from LayoutDevTool
- Control FX checkbox from LayoutDevTool panel
- Bridge pillars and ropes visual elements
- ADR-001-determinism.md (content merged into docs/simulation.md)
