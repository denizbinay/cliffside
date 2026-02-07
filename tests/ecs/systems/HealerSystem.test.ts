import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createHealerSystem } from "../../../src/ecs/systems/HealerSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Combat, Health } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("HealerSystem", () => {
  it("heals the ally with the most missing health", () => {
    const world = createGameWorld();
    world.time.delta = 0.5;

    const configStore = new ConfigStore(UNIT_TYPES);
    const healer = createUnit(world, {
      config: UNIT_TYPES.cleric,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    const ally = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 40,
      y: 0,
      configStore
    });

    Health.current[ally] = Health.max[ally] - 20;
    Combat.cooldown[healer] = 0;

    const system = createHealerSystem(() => 0);
    system(world);

    expect(Health.current[ally]).toBe(Health.max[ally]);
    expect(Combat.cooldown[healer]).toBeCloseTo(Combat.attackRate[healer]);
  });
});
