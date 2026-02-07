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

  it("supports crit damage through beforeAttack event hook", () => {
    const world = createGameWorld({ seed: 99 });
    const customTypes = {
      ...UNIT_TYPES,
      saboteur: {
        ...UNIT_TYPES.saboteur,
        critChance: 1,
        critMultiplier: 2,
        statusOnHit: undefined
      }
    };
    const configStore = new ConfigStore(customTypes);

    const attacker = createUnit(world, {
      config: customTypes.saboteur,
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
    Combat.cooldown[attacker] = 0;
    Combat.range[attacker] = 50;
    Target.entityId[attacker] = target;
    Health.current[target] = 50;

    const system = createCombatSystem(configStore);
    system(world);

    expect(Health.current[target]).toBe(30);
  });

  it("applies on-kill self buff through combat events", () => {
    const world = createGameWorld({ seed: 5 });
    const customTypes = {
      ...UNIT_TYPES,
      saboteur: {
        ...UNIT_TYPES.saboteur,
        statusOnHit: undefined,
        onKill: { type: "selfBuff" as const, duration: 1.5, power: 1.25 }
      }
    };
    const configStore = new ConfigStore(customTypes);

    const attacker = createUnit(world, {
      config: customTypes.saboteur,
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

    Combat.damage[attacker] = 20;
    Combat.cooldown[attacker] = 0;
    Combat.range[attacker] = 50;
    Target.entityId[attacker] = target;
    Health.current[target] = 15;

    const system = createCombatSystem(configStore);
    system(world);

    expect(Health.current[target]).toBe(0);
    expect(StatusEffects.buffTimer[attacker]).toBeCloseTo(1.5);
    expect(StatusEffects.buffPower[attacker]).toBeCloseTo(1.25);
  });
});
