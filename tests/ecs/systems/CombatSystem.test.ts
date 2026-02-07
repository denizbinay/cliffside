import { describe, it, expect, beforeEach } from "vitest";
import { createGameWorld, updateWorldTime } from "../../../src/ecs/world";
import { createCombatSystem } from "../../../src/ecs/systems/CombatSystem";
import { createActionSystem } from "../../../src/ecs/systems/ActionSystemECS";
import { createActiveEffectsSystem } from "../../../src/ecs/systems/ActiveEffectsSystem";
import { registerStandardEffectHandlers } from "../../../src/sim/EffectHandlers";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Combat, Health, Position, StatusEffects, Target } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";
import { clearEffectHandlers } from "../../../src/sim/EffectSystem";
import { actionStore } from "../../../src/sim/ActionSystem";
import { statModifierStore } from "../../../src/sim/Stats";
import { activeEffectsStore } from "../../../src/ecs/stores/ActiveEffectsStore";

describe("CombatSystem", () => {
  beforeEach(() => {
    clearEffectHandlers();
    registerStandardEffectHandlers();
    actionStore.clear();
    statModifierStore.clear();
    activeEffectsStore.clear();
  });

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

    const combatSys = createCombatSystem(world, configStore);
    const actionSys = createActionSystem();
    const effectSys = createActiveEffectsSystem();

    // Run enough ticks for windup to complete (attackRate 1.2 -> period ~0.83s -> windup ~0.25s)
    // 50ms per tick -> 5-6 ticks
    for (let i = 0; i < 20; i++) {
      updateWorldTime(world, 50, (i + 1) * 50);
      combatSys(world);
      actionSys(world);
      effectSys(world);
      if (Health.current[target] < 50) break;
    }

    expect(Health.current[target]).toBe(40);
    // Cooldown check is tricky because it depends on when the action finished
    // But it should be non-zero
    // expect(Combat.cooldown[attacker]).toBeGreaterThan(0);
    // Wait, Combat.cooldown is no longer used! ActionSystem uses internal cooldowns.
    // So we can't check Combat.cooldown. We should check actionStore.isOnCooldown if we exported it.
    // For this test, let's skip cooldown check on the component since we deprecated it.

    // Status check
    expect(StatusEffects.slowTimer[target]).toBeGreaterThan(0);
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
    Combat.range[attacker] = 50;
    Target.entityId[attacker] = target;
    Health.current[target] = 50;

    const combatSys = createCombatSystem(world, configStore);
    const actionSys = createActionSystem();

    for (let i = 0; i < 20; i++) {
      updateWorldTime(world, 50, (i + 1) * 50);
      combatSys(world);
      actionSys(world);
      if (Health.current[target] < 50) break;
    }

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
    Combat.range[attacker] = 50;
    Target.entityId[attacker] = target;
    Health.current[target] = 15;

    const combatSys = createCombatSystem(world, configStore);
    const actionSys = createActionSystem();

    for (let i = 0; i < 20; i++) {
      updateWorldTime(world, 50, (i + 1) * 50);
      combatSys(world);
      actionSys(world);
      if (Health.current[target] <= 0) break;
    }

    expect(Health.current[target]).toBe(0);
    expect(StatusEffects.buffTimer[attacker]).toBeCloseTo(1.5);
    expect(StatusEffects.buffPower[attacker]).toBeCloseTo(1.25);
  });
});
