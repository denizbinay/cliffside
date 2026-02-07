import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createHealthSystem } from "../../../src/ecs/systems/HealthSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Animation, ANIM_ACTION, Death, Health } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("HealthSystem", () => {
  it("marks death and locks animation", () => {
    const world = createGameWorld();
    world.time.now = 1000;

    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    Health.current[eid] = 0;

    const system = createHealthSystem();
    system(world);

    expect(Death.started[eid]).toBe(1);
    expect(Death.cleanupAt[eid]).toBe(1500);
    expect(Animation.currentAction[eid]).toBe(ANIM_ACTION.DEATH);
    expect(Animation.locked[eid]).toBe(1);
    expect(Animation.lockUntil[eid]).toBe(1500);
  });
});
