import { describe, it, expect } from "vitest";
import { addComponent, addEntity } from "bitecs";
import { createGameWorld } from "../../../src/ecs/world";
import { Health } from "../../../src/ecs/components";

describe("Health component", () => {
  it("clamps current health to max", () => {
    const world = createGameWorld();
    const eid = addEntity(world);

    addComponent(world, Health, eid);
    Health.max[eid] = 100;
    Health.current[eid] = 120;

    Health.current[eid] = Math.min(Health.current[eid], Health.max[eid]);
    expect(Health.current[eid]).toBe(100);
  });

  it("detects when an entity is dead", () => {
    const world = createGameWorld();
    const eid = addEntity(world);

    addComponent(world, Health, eid);
    Health.current[eid] = 0;
    const isDead = Health.current[eid] <= 0;
    expect(isDead).toBe(true);
  });
});
