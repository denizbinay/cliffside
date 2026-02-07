import { describe, it, expect, beforeEach } from "vitest";
import { createTestWorld } from "../../src/sim/TestUtils";
import { EFFECT_KIND, applyEffect } from "../../src/sim/EffectSystem";
import { statModifierStore, STAT, MODIFIER_TYPE, getStat } from "../../src/sim/Stats";

describe("EffectHandlers - Generic Stat Mod", () => {
  beforeEach(() => {
    statModifierStore.clear();
  });

  it("should apply generic stat modifier", () => {
    const world = createTestWorld();

    const sourceEid = 1;
    const targetEid = 2;

    // Apply +10 Flat Armor
    applyEffect(world, sourceEid, targetEid, {
      kind: EFFECT_KIND.APPLY_STAT_MOD,
      value: 10,
      duration: 5,
      payload: {
        stat: STAT.ARMOR,
        type: MODIFIER_TYPE.FLAT
      }
    });

    // Check if modifier exists
    const modifiers = statModifierStore.get(targetEid);
    expect(modifiers).toHaveLength(1);
    expect(modifiers[0].stat).toBe(STAT.ARMOR);
    expect(modifiers[0].value).toBe(10);

    // Check calculation
    const effectiveArmor = getStat(targetEid, STAT.ARMOR, 20); // Base 20
    expect(effectiveArmor).toBe(30); // 20 + 10
  });

  it("should support percent add modifiers", () => {
    const world = createTestWorld();
    const sourceEid = 1;
    const targetEid = 2;

    // Apply +50% Attack Speed
    applyEffect(world, sourceEid, targetEid, {
      kind: EFFECT_KIND.APPLY_STAT_MOD,
      value: 0.5,
      duration: 5,
      payload: {
        stat: STAT.ATTACK_SPEED,
        type: MODIFIER_TYPE.PERCENT_ADD
      }
    });

    const effectiveAS = getStat(targetEid, STAT.ATTACK_SPEED, 1.0); // Base 1.0
    expect(effectiveAS).toBe(1.5); // 1.0 * (1 + 0.5)
  });

  it("should replace existing modifier of same stat/tag", () => {
    const world = createTestWorld();
    const sourceEid = 1;
    const targetEid = 2;

    // First application
    applyEffect(world, sourceEid, targetEid, {
      kind: EFFECT_KIND.APPLY_STAT_MOD,
      value: 10,
      duration: 5,
      payload: {
        stat: STAT.ARMOR,
        type: MODIFIER_TYPE.FLAT
      }
    });

    let modifiers = statModifierStore.get(targetEid);
    expect(modifiers[0].value).toBe(10);

    // Refresh with higher value
    applyEffect(world, sourceEid, targetEid, {
      kind: EFFECT_KIND.APPLY_STAT_MOD,
      value: 20,
      duration: 10,
      payload: {
        stat: STAT.ARMOR,
        type: MODIFIER_TYPE.FLAT
      }
    });

    modifiers = statModifierStore.get(targetEid);
    expect(modifiers).toHaveLength(1); // Should replace, not add
    expect(modifiers[0].value).toBe(20);
    expect(modifiers[0].duration).toBe(10);
  });
});
