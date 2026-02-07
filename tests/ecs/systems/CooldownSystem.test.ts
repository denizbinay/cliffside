import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createCooldownSystem } from "../../../src/ecs/systems/CooldownSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Combat } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("CooldownSystem", () => {
  it("ticks down combat cooldowns", () => {
    const world = createGameWorld();
    world.time.delta = 0.4;

    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    Combat.cooldown[eid] = 1;

    const system = createCooldownSystem();
    system(world);

    expect(Combat.cooldown[eid]).toBeCloseTo(0.6);
  });
});
