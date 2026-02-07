import { describe, it, expect } from "vitest";
import { createGameWorld, resetGameWorld, updateWorldTime } from "../../src/ecs/world";

describe("ecs world", () => {
  it("creates a world with default time and scene", () => {
    const world = createGameWorld();
    expect(world.time.delta).toBe(0);
    expect(world.time.elapsed).toBe(0);
    expect(world.time.now).toBe(0);
    expect(world.scene).toBeNull();
  });

  it("updates world time values", () => {
    const world = createGameWorld();
    updateWorldTime(world, 16, 1000);
    expect(world.time.delta).toBe(16);
    expect(world.time.elapsed).toBe(16);
    expect(world.time.now).toBe(1000);

    updateWorldTime(world, 20, 1020);
    expect(world.time.delta).toBe(20);
    expect(world.time.elapsed).toBe(36);
    expect(world.time.now).toBe(1020);
  });

  it("resets world state", () => {
    const world = createGameWorld();
    updateWorldTime(world, 20, 500);
    world.scene = { id: "fake" } as unknown as Phaser.Scene;

    resetGameWorld(world);
    expect(world.time.delta).toBe(0);
    expect(world.time.elapsed).toBe(0);
    expect(world.time.now).toBe(0);
    expect(world.scene).toBeNull();
  });
});
