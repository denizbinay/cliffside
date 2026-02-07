import { createWorld, resetWorld } from "bitecs";
import type { IWorld } from "bitecs";

export interface GameWorld extends IWorld {
  time: {
    delta: number;
    elapsed: number;
    now: number;
  };
  scene: Phaser.Scene | null;
}

export function createGameWorld(): GameWorld {
  const world = createWorld() as GameWorld;
  world.time = { delta: 0, elapsed: 0, now: 0 };
  world.scene = null;
  return world;
}

export function resetGameWorld(world: GameWorld): void {
  resetWorld(world);
  world.time = { delta: 0, elapsed: 0, now: 0 };
  world.scene = null;
}

export function updateWorldTime(world: GameWorld, delta: number, now: number): void {
  world.time.delta = delta;
  world.time.elapsed += delta;
  world.time.now = now;
}
