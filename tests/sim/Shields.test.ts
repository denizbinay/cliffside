import { describe, it, expect, beforeEach } from "vitest";
import { SHIELD_ABSORB, shieldStore, absorbDamage, createShield } from "../../src/sim/Shields";
import { DAMAGE_TYPE } from "../../src/sim/DamageTypes";

describe("Shields", () => {
  beforeEach(() => {
    shieldStore.clear();
  });

  describe("createShield", () => {
    it("creates a shield with correct values", () => {
      const shield = createShield(1, 0, 100, 5);
      expect(shield.amount).toBe(100);
      expect(shield.maxAmount).toBe(100);
      expect(shield.duration).toBe(5);
    });

    it("stacks multiple shields", () => {
      createShield(1, 0, 100);
      createShield(1, 0, 50);
      expect(shieldStore.getTotalShield(1)).toBe(150);
    });
  });

  describe("absorbDamage", () => {
    it("absorbs damage up to shield amount", () => {
      createShield(1, 0, 100);

      const result = absorbDamage(1, 60, DAMAGE_TYPE.PHYSICAL);
      expect(result.absorbed).toBe(60);
      expect(result.remaining).toBe(0);
      expect(shieldStore.getTotalShield(1)).toBe(40);
    });

    it("breaks shield when depleted", () => {
      createShield(1, 0, 50);

      const result = absorbDamage(1, 100, DAMAGE_TYPE.PHYSICAL);
      expect(result.absorbed).toBe(50);
      expect(result.remaining).toBe(50);
      expect(result.shieldsBroken).toBe(1);
      expect(shieldStore.getTotalShield(1)).toBe(0);
    });

    it("consumes shields in priority order", () => {
      createShield(1, 0, 50, -1, SHIELD_ABSORB.ALL, 1);
      createShield(1, 0, 100, -1, SHIELD_ABSORB.ALL, 2);

      // Higher priority (100 shield) should be consumed first
      const result = absorbDamage(1, 120, DAMAGE_TYPE.PHYSICAL);
      expect(result.absorbed).toBe(120);
      expect(shieldStore.getTotalShield(1)).toBe(30);
    });
  });

  describe("shield types", () => {
    it("physical shield only blocks physical damage", () => {
      createShield(1, 0, 100, -1, SHIELD_ABSORB.PHYSICAL);

      const magicResult = absorbDamage(1, 50, DAMAGE_TYPE.MAGIC);
      expect(magicResult.absorbed).toBe(0);
      expect(magicResult.remaining).toBe(50);

      const physResult = absorbDamage(1, 50, DAMAGE_TYPE.PHYSICAL);
      expect(physResult.absorbed).toBe(50);
    });

    it("magic shield only blocks magic damage", () => {
      createShield(1, 0, 100, -1, SHIELD_ABSORB.MAGIC);

      const physResult = absorbDamage(1, 50, DAMAGE_TYPE.PHYSICAL);
      expect(physResult.absorbed).toBe(0);

      const magicResult = absorbDamage(1, 50, DAMAGE_TYPE.MAGIC);
      expect(magicResult.absorbed).toBe(50);
    });
  });

  describe("shield expiration", () => {
    it("removes expired shields", () => {
      createShield(1, 0, 100, 2);
      expect(shieldStore.getTotalShield(1)).toBe(100);

      shieldStore.tick(1, 1);
      expect(shieldStore.getTotalShield(1)).toBe(100);

      shieldStore.tick(1, 1.5);
      expect(shieldStore.getTotalShield(1)).toBe(0);
    });

    it("keeps permanent shields", () => {
      createShield(1, 0, 100, -1);

      shieldStore.tick(1, 100);
      expect(shieldStore.getTotalShield(1)).toBe(100);
    });
  });
});
