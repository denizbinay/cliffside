import { describe, it, expect, beforeEach } from "vitest";
import {
  ACTION_STATE,
  INTERRUPT,
  ABILITY_FLAG,
  actionStore,
  startAction,
  tickAction,
  interruptAction,
  canCast
} from "../../src/sim/ActionSystem";
import type { ActionDef } from "../../src/sim/ActionSystem";

describe("ActionSystem", () => {
  beforeEach(() => {
    actionStore.clear();
  });

  const basicAttack: ActionDef = {
    id: "basic_attack",
    windup: 0.3,
    channel: 0,
    recovery: 0.2,
    cooldown: 1.0,
    interruptedBy: INTERRUPT.HARD_CC,
    flags: ABILITY_FLAG.ATTACK,
    cost: 0
  };

  const channelSpell: ActionDef = {
    id: "channel_spell",
    windup: 0.5,
    channel: 2.0,
    recovery: 0,
    cooldown: 10,
    interruptedBy: INTERRUPT.HARD_CC | INTERRUPT.SILENCE,
    flags: ABILITY_FLAG.SPELL,
    cost: 50
  };

  describe("startAction", () => {
    it("starts an action in windup state", () => {
      const result = startAction(1, basicAttack, 2, 0);
      expect(result.success).toBe(true);

      const action = actionStore.getAction(1);
      expect(action?.state).toBe(ACTION_STATE.WINDUP);
      expect(action?.stateTimer).toBe(0.3);
    });

    it("fails when on cooldown", () => {
      startAction(1, basicAttack, 2, 0);
      tickAction(1, 0.3);
      tickAction(1, 0.2);

      const result = startAction(1, basicAttack, 2, 1);
      expect(result.success).toBe(false);
      expect(result.reason).toBe("on_cooldown");
    });

    it("fails when already casting", () => {
      startAction(1, basicAttack, 2, 0);

      const result = startAction(1, channelSpell, 2, 0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe("already_casting");
    });
  });

  describe("tickAction", () => {
    it("transitions through states", () => {
      startAction(1, basicAttack, 2, 0);

      // Tick through windup
      let result = tickAction(1, 0.3);
      expect(result.released).toBe(true);

      // Now in recovery
      const action = actionStore.getAction(1);
      expect(action?.state).toBe(ACTION_STATE.RECOVERY);

      // Tick through recovery
      result = tickAction(1, 0.2);
      expect(result.completed).toBe(true);
      expect(result.active).toBe(false);

      // Should be on cooldown
      expect(actionStore.isOnCooldown(1, "basic_attack")).toBe(true);
    });

    it("handles channeled abilities", () => {
      startAction(1, channelSpell, 2, 0);

      // Tick through windup
      let result = tickAction(1, 0.5);
      expect(result.released).toBe(true);

      const action = actionStore.getAction(1);
      expect(action?.state).toBe(ACTION_STATE.CHANNEL);

      // Tick through channel
      result = tickAction(1, 2.0);
      expect(result.completed).toBe(true);
    });
  });

  describe("interruptAction", () => {
    it("interrupts action with matching CC", () => {
      startAction(1, basicAttack, 2, 0);

      const interrupted = interruptAction(1, INTERRUPT.STUN);
      expect(interrupted).toBe(true);

      const result = tickAction(1, 0);
      expect(result.interrupted).toBe(true);
    });

    it("fails to interrupt with non-matching CC", () => {
      startAction(1, basicAttack, 2, 0);

      // Silence doesn't interrupt attacks
      const interrupted = interruptAction(1, INTERRUPT.SILENCE);
      expect(interrupted).toBe(false);
    });

    it("cannot interrupt unstoppable abilities", () => {
      const unstoppableAbility: ActionDef = {
        ...basicAttack,
        id: "unstoppable",
        flags: ABILITY_FLAG.ATTACK | ABILITY_FLAG.UNSTOPPABLE
      };

      startAction(1, unstoppableAbility, 2, 0);

      const interrupted = interruptAction(1, INTERRUPT.STUN);
      expect(interrupted).toBe(false);
    });
  });

  describe("canCast", () => {
    it("blocks spells when silenced", () => {
      expect(canCast(1, channelSpell, INTERRUPT.SILENCE)).toBe(false);
    });

    it("blocks attacks when disarmed", () => {
      expect(canCast(1, basicAttack, INTERRUPT.DISARM)).toBe(false);
    });

    it("blocks everything when stunned", () => {
      expect(canCast(1, basicAttack, INTERRUPT.STUN)).toBe(false);
      expect(canCast(1, channelSpell, INTERRUPT.STUN)).toBe(false);
    });

    it("allows casting when not CC'd", () => {
      expect(canCast(1, basicAttack, 0)).toBe(true);
      expect(canCast(1, channelSpell, 0)).toBe(true);
    });
  });

  describe("cooldown management", () => {
    it("ticks cooldowns", () => {
      actionStore.setCooldown(1, "test", 5);
      expect(actionStore.getCooldown(1, "test")).toBe(5);

      actionStore.tickCooldowns(1, 2);
      expect(actionStore.getCooldown(1, "test")).toBe(3);

      actionStore.tickCooldowns(1, 4);
      expect(actionStore.getCooldown(1, "test")).toBe(0);
    });

    it("resets cooldowns", () => {
      actionStore.setCooldown(1, "test", 5);
      actionStore.resetCooldown(1, "test");
      expect(actionStore.getCooldown(1, "test")).toBe(0);
    });

    it("reduces cooldowns", () => {
      actionStore.setCooldown(1, "test", 5);
      actionStore.reduceCooldown(1, "test", 2);
      expect(actionStore.getCooldown(1, "test")).toBe(3);
    });
  });
});
