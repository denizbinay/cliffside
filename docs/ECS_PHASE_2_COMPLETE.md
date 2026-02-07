# ECS Phase 2 Complete

## Factory Function Signatures

```ts
export interface CreateUnitOptions {
  config: UnitTypeConfig;
  side: Side;
  x: number;
  y: number;
  modifiers?: Partial<StanceModifiers>;
  presenceMult?: number;
  configStore?: ConfigStore;
}

export function createUnit(world: GameWorld, options: CreateUnitOptions): number;

export interface CreateCastleOptions {
  side: Side;
  x: number;
  y: number;
  maxHp?: number;
}

export function createCastle(world: GameWorld, options: CreateCastleOptions): number;

export interface CreateTurretOptions {
  side: Side;
  x: number;
  y: number;
  maxHp?: number;
  damage?: number;
  range?: number;
  attackRate?: number;
}

export function createTurret(world: GameWorld, options: CreateTurretOptions): number;

export interface CreateControlPointOptions {
  x: number;
  y: number;
  owner?: Side | "neutral";
}

export function createControlPoint(world: GameWorld, options: CreateControlPointOptions): number;
```

## Archetype Component Lists

| Archetype | Components |
| --- | --- |
| Unit | `Position`, `Velocity`, `Health`, `Combat`, `StatusEffects`, `Faction`, `Role`, `Target`, `Animation`, `Render`, `UnitConfig`, `Presence`, `Death`, `EntityType` |
| Castle | `Position`, `Health`, `Faction`, `Render`, `Death`, `EntityType` |
| Turret | `Position`, `Health`, `Combat`, `StatusEffects`, `Faction`, `Render`, `Death`, `EntityType` |
| ControlPoint | `Position`, `Faction`, `EntityType` |

## GameScene Integration Snippets

```ts
import { GameSceneBridge } from "../ecs/bridges/GameSceneBridge";

export default class GameScene extends Phaser.Scene {
  ecsBridge!: GameSceneBridge;

  create(): void {
    this.ecsBridge = new GameSceneBridge(this);
    this.events.once("shutdown", () => this.ecsBridge.destroy());
  }

  update(_: number, deltaMs: number): void {
    const delta = deltaMs / 1000;
    this.ecsBridge.update(delta, this.time.now);
  }
}
```

## Entity Lifecycle Diagram

```
[GameScene] -> [GameSceneBridge] -> [Factory] -> [Archetype] -> [World]
      |             |                |             |            |
      |             |                |             |            v
      |             |                |         [Components] -> [Systems]
      |             |                |                           |
      |             |                |                           v
      |             |            [EntityRegistry]        [Cleanup/Remove]
      |             |                |                           |
      v             v                v                           v
  shutdown -> renderStore.clear -> registry.clear -> resetGameWorld
```
