import { describe, it, expect, beforeEach } from "vitest";
import {
  RESOURCE_TYPE,
  resourceStore,
  spendResource,
  restoreResource,
  addStacks,
  canAfford,
  tickResource
} from "../../src/sim/Resources";

describe("Resources", () => {
  beforeEach(() => {
    resourceStore.clear();
  });

  describe("mana resource", () => {
    it("initializes with max value", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.MANA,
        max: 100,
        regen: 5
      });

      const state = resourceStore.get(1);
      expect(state?.current).toBe(100);
      expect(state?.max).toBe(100);
    });

    it("can spend mana", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.MANA,
        max: 100,
        regen: 5
      });

      const result = spendResource(1, 30);
      expect(result.success).toBe(true);
      expect(result.spent).toBe(30);
      expect(resourceStore.get(1)?.current).toBe(70);
    });

    it("fails to spend more than available", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.MANA,
        max: 100,
        regen: 5
      });

      spendResource(1, 80);
      const result = spendResource(1, 30);
      expect(result.success).toBe(false);
      expect(resourceStore.get(1)?.current).toBe(20);
    });

    it("regenerates over time", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.MANA,
        max: 100,
        regen: 10
      });

      spendResource(1, 50);
      expect(resourceStore.get(1)?.current).toBe(50);

      tickResource(1, 2);
      expect(resourceStore.get(1)?.current).toBe(70);
    });

    it("does not exceed max", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.MANA,
        max: 100,
        regen: 50
      });

      tickResource(1, 10);
      expect(resourceStore.get(1)?.current).toBe(100);
    });
  });

  describe("charge resource", () => {
    it("starts with max charges", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.CHARGE,
        maxCharges: 3,
        rechargeTime: 5
      });

      const state = resourceStore.get(1);
      expect(state?.charges).toBe(3);
      expect(state?.maxCharges).toBe(3);
    });

    it("spends charges", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.CHARGE,
        maxCharges: 3,
        rechargeTime: 5
      });

      spendResource(1, 1);
      expect(resourceStore.get(1)?.charges).toBe(2);
    });

    it("recharges over time", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.CHARGE,
        maxCharges: 3,
        rechargeTime: 5
      });

      spendResource(1, 2);
      expect(resourceStore.get(1)?.charges).toBe(1);

      tickResource(1, 5);
      expect(resourceStore.get(1)?.charges).toBe(2);

      tickResource(1, 5);
      expect(resourceStore.get(1)?.charges).toBe(3);
    });
  });

  describe("stack resource", () => {
    it("starts with zero stacks", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.STACK,
        maxStacks: 5,
        decayTime: 3
      });

      expect(resourceStore.get(1)?.stacks).toBe(0);
    });

    it("adds stacks", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.STACK,
        maxStacks: 5,
        decayTime: 3
      });

      addStacks(1, 3);
      expect(resourceStore.get(1)?.stacks).toBe(3);
    });

    it("respects max stacks", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.STACK,
        maxStacks: 5,
        decayTime: 3
      });

      addStacks(1, 10);
      expect(resourceStore.get(1)?.stacks).toBe(5);
    });

    it("decays stacks over time", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.STACK,
        maxStacks: 5,
        decayTime: 3,
        decayAll: false
      });

      addStacks(1, 3);
      expect(resourceStore.get(1)?.stacks).toBe(3);

      tickResource(1, 3.1);
      expect(resourceStore.get(1)?.stacks).toBe(2);
    });
  });

  describe("canAfford", () => {
    it("checks mana affordability", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.MANA,
        max: 100
      });

      expect(canAfford(1, 50)).toBe(true);
      expect(canAfford(1, 150)).toBe(false);
    });

    it("health cost is always affordable", () => {
      resourceStore.init(1, {
        type: RESOURCE_TYPE.HEALTH,
        max: 100
      });

      expect(canAfford(1, 200)).toBe(true);
    });
  });
});
