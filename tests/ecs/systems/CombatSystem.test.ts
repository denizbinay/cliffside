import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createCombatSystem } from "../../../src/ecs/systems/CombatSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Combat, Health, Position, StatusEffects, Target } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("CombatSystem", () => {
  it("applies damage, cooldown, and status-on-hit", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);

    const attacker = createUnit(world, {
      config: UNIT_TYPES.saboteur,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    const target = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "ai",
      x: 10,
      y: 0,
      configStore
    });

    Combat.damage[attacker] = 10;
    Combat.attackRate[attacker] = 1.2;
    Combat.cooldown[attacker] = 0;
    Combat.range[attacker] = 50;

    Health.current[target] = 50;
    Position.x[target] = 10;
    Target.entityId[attacker] = target;

    const system = createCombatSystem(configStore);
    system(world);

    expect(Health.current[target]).toBe(40);
    expect(Combat.cooldown[attacker]).toBeCloseTo(1.2);
    expect(StatusEffects.slowTimer[target]).toBeCloseTo(1.2);
    expect(StatusEffects.slowPower[target]).toBeCloseTo(0.6);
  });
});
