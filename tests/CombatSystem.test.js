import { describe, it, expect, beforeEach, vi } from "vitest";
import { SIDE, COMBAT_CONFIG, CASTLE_CONFIG } from "../src/config/GameConfig.js";
import CombatSystem from "../src/systems/CombatSystem.js";
import GameContext from "../src/core/GameContext.js";
import { createUnitData } from "../src/entities/UnitData.js";
import { createCastleData } from "../src/entities/CastleData.js";
import { resetEntityIdCounter } from "../src/core/GameState.js";
import { GameEvents } from "../src/core/EventBus.js";

function createMockContext() {
  resetEntityIdCounter();
  const ctx = new GameContext();
  ctx.state.setControlPoints([]);
  
  // Create castles
  ctx.state.setCastle(SIDE.PLAYER, createCastleData({
    side: SIDE.PLAYER,
    x: 100,
    y: 360
  }));
  ctx.state.setCastle(SIDE.AI, createCastleData({
    side: SIDE.AI,
    x: 1180,
    y: 360
  }));
  
  return ctx;
}

function createTestUnit(ctx, options) {
  const unit = createUnitData({
    type: "guard",
    side: SIDE.PLAYER,
    x: 200,
    y: 360,
    ...options
  });
  return ctx.state.addUnit(unit);
}

describe("CombatSystem", () => {
  let combat;
  let ctx;

  beforeEach(() => {
    ctx = createMockContext();
    combat = new CombatSystem(ctx);
  });

  describe("findTarget", () => {
    it("returns null when no enemies", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      const enemies = [];
      
      const target = combat.findTarget(attacker, enemies);
      expect(target).toBeNull();
    });

    it("returns closest enemy in range", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.range = 100;
      
      const enemy1 = createTestUnit(ctx, { side: SIDE.AI, x: 280 });
      const enemy2 = createTestUnit(ctx, { side: SIDE.AI, x: 250 });
      
      const target = combat.findTarget(attacker, [enemy1, enemy2]);
      expect(target).toBe(enemy2); // Closer
    });

    it("returns null when enemies out of range", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.range = 50;
      
      const enemy = createTestUnit(ctx, { side: SIDE.AI, x: 400 });
      
      const target = combat.findTarget(attacker, [enemy]);
      expect(target).toBeNull();
    });

    it("ignores dead enemies", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.range = 100;
      
      const enemy = createTestUnit(ctx, { side: SIDE.AI, x: 250 });
      enemy.hp = 0; // Dead
      
      const target = combat.findTarget(attacker, [enemy]);
      expect(target).toBeNull();
    });
  });

  describe("findHealTarget", () => {
    it("returns null when no allies need healing", () => {
      const healer = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      healer.range = 100;
      
      const ally = createTestUnit(ctx, { side: SIDE.PLAYER, x: 250 });
      // ally at full HP
      
      const target = combat.findHealTarget(healer, [ally]);
      expect(target).toBeNull();
    });

    it("returns most damaged ally in range", () => {
      const healer = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      healer.range = 100;
      
      const ally1 = createTestUnit(ctx, { side: SIDE.PLAYER, x: 250 });
      ally1.hp = ally1.maxHp - 10;
      
      const ally2 = createTestUnit(ctx, { side: SIDE.PLAYER, x: 260 });
      ally2.hp = ally2.maxHp - 50; // More damaged
      
      const target = combat.findHealTarget(healer, [ally1, ally2]);
      expect(target).toBe(ally2);
    });
  });

  describe("inCastleRange", () => {
    it("returns true when in range", () => {
      const unit = createTestUnit(ctx, { x: 100 + COMBAT_CONFIG.castleAttackRange - 10 });
      const castle = ctx.state.getCastle(SIDE.AI);
      castle.x = 100;
      
      expect(combat.inCastleRange(unit, castle)).toBe(true);
    });

    it("returns false when out of range", () => {
      const unit = createTestUnit(ctx, { x: 100 + COMBAT_CONFIG.castleAttackRange + 100 });
      const castle = ctx.state.getCastle(SIDE.AI);
      castle.x = 100;
      
      expect(combat.inCastleRange(unit, castle)).toBe(false);
    });
  });

  describe("performAttack", () => {
    it("deals damage to target", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.dmg = 20;
      
      const target = createTestUnit(ctx, { side: SIDE.AI, x: 250 });
      const initialHp = target.hp;
      
      combat.performAttack(attacker, target);
      
      expect(target.hp).toBe(initialHp - 20);
    });

    it("sets attack cooldown after attack", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.attackCooldown = 0;
      
      const target = createTestUnit(ctx, { side: SIDE.AI, x: 250 });
      
      combat.performAttack(attacker, target);
      
      expect(attacker.attackCooldown).toBe(attacker.attackRate);
    });

    it("emits ATTACK_PERFORMED event", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      const target = createTestUnit(ctx, { side: SIDE.AI, x: 250 });
      
      const eventHandler = vi.fn();
      ctx.events.on(GameEvents.ATTACK_PERFORMED, eventHandler);
      
      combat.performAttack(attacker, target);
      
      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining({
        attacker,
        target
      }));
    });

    it("emits UNIT_DIED when target dies", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.dmg = 9999;
      
      const target = createTestUnit(ctx, { side: SIDE.AI, x: 250 });
      
      const eventHandler = vi.fn();
      ctx.events.on(GameEvents.UNIT_DIED, eventHandler);
      
      combat.performAttack(attacker, target);
      
      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining({
        unit: target
      }));
    });
  });

  describe("attackCastle", () => {
    it("deals damage to castle", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.dmg = 50;
      
      const castle = ctx.state.getCastle(SIDE.AI);
      const initialHp = castle.hp;
      
      combat.attackCastle(attacker, castle);
      
      expect(castle.hp).toBe(initialHp - 50);
    });

    it("emits CASTLE_DAMAGED event", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.dmg = 50;
      
      const castle = ctx.state.getCastle(SIDE.AI);
      
      const eventHandler = vi.fn();
      ctx.events.on(GameEvents.CASTLE_DAMAGED, eventHandler);
      
      combat.attackCastle(attacker, castle);
      
      expect(eventHandler).toHaveBeenCalledTimes(1);
    });

    it("emits CASTLE_DESTROYED when castle dies", () => {
      const attacker = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      attacker.dmg = CASTLE_CONFIG.maxHp + 100;
      
      const castle = ctx.state.getCastle(SIDE.AI);
      
      const eventHandler = vi.fn();
      ctx.events.on(GameEvents.CASTLE_DESTROYED, eventHandler);
      
      combat.attackCastle(attacker, castle);
      
      expect(eventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyWaveLock", () => {
    it("locks wave when countdown is below threshold", () => {
      combat.applyWaveLock(1);
      expect(ctx.state.waveLocked).toBe(true);
    });

    it("unlocks wave when countdown is above threshold", () => {
      combat.applyWaveLock(10);
      expect(ctx.state.waveLocked).toBe(false);
    });
  });

  describe("checkGameOver", () => {
    it("ends game when player castle is destroyed", () => {
      const playerCastle = ctx.state.getCastle(SIDE.PLAYER);
      playerCastle.hp = 0;
      
      combat.checkGameOver();
      
      expect(ctx.state.isGameOver).toBe(true);
      expect(ctx.state.winner).toBe("AI");
    });

    it("ends game when AI castle is destroyed", () => {
      const aiCastle = ctx.state.getCastle(SIDE.AI);
      aiCastle.hp = 0;
      
      combat.checkGameOver();
      
      expect(ctx.state.isGameOver).toBe(true);
      expect(ctx.state.winner).toBe("Player");
    });

    it("does not end game when both castles alive", () => {
      combat.checkGameOver();
      
      expect(ctx.state.isGameOver).toBe(false);
    });

    it("emits GAME_OVER event", () => {
      const eventHandler = vi.fn();
      ctx.events.on(GameEvents.GAME_OVER, eventHandler);
      
      const aiCastle = ctx.state.getCastle(SIDE.AI);
      aiCastle.hp = 0;
      
      combat.checkGameOver();
      
      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith({ winner: "Player" });
    });
  });

  describe("update", () => {
    it("does nothing when game is over", () => {
      ctx.state.isGameOver = true;
      
      const unit = createTestUnit(ctx, { side: SIDE.PLAYER, x: 200 });
      const initialX = unit.x;
      
      combat.update(1);
      
      // Unit should not have moved
      expect(unit.x).toBe(initialX);
    });
  });
});
