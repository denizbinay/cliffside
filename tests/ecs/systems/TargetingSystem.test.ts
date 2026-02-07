import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createTargetingSystem } from "../../../src/ecs/systems/TargetingSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Combat, Position, Target } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("TargetingSystem", () => {
  it("picks the closest enemy within range", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);

    const attacker = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });
    Combat.range[attacker] = 50;

    const enemyA = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "ai",
      x: 30,
      y: 0,
      configStore
    });
    const enemyB = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "ai",
      x: 20,
      y: 0,
      configStore
    });

    const system = createTargetingSystem();
    system(world);

    expect(Target.entityId[attacker]).toBe(enemyB);
    expect(Target.distance[attacker]).toBe(20);
    expect(Position.x[enemyA]).toBe(30);
  });

  it("clears target when nothing is in range", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);

    const attacker = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });
    Combat.range[attacker] = 10;

    createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "ai",
      x: 40,
      y: 0,
      configStore
    });

    const system = createTargetingSystem();
    system(world);

    expect(Target.entityId[attacker]).toBe(0);
    expect(Target.distance[attacker]).toBe(Number.POSITIVE_INFINITY);
  });
});
