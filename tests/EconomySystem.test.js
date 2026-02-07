import { describe, it, expect, beforeEach } from "vitest";
import { ECONOMY_CONFIG, SIDE } from "../src/config/GameConfig.js";
import EconomySystem from "../src/systems/EconomySystem.js";
import GameContext from "../src/core/GameContext.js";

function createMockContext() {
  const ctx = new GameContext();
  // Set initial control points for testing
  ctx.state.setControlPoints([]);
  return ctx;
}

describe("EconomySystem", () => {
  let economy;
  let ctx;

  beforeEach(() => {
    ctx = createMockContext();
    economy = new EconomySystem(ctx);
  });

  it("initializes with starting resources for both sides", () => {
    expect(economy.getResources(SIDE.PLAYER)).toBe(ECONOMY_CONFIG.startingResources);
    expect(economy.getResources(SIDE.AI)).toBe(ECONOMY_CONFIG.startingResources);
  });

  it("getResources returns the correct side", () => {
    expect(economy.getResources(SIDE.PLAYER)).toBe(ECONOMY_CONFIG.startingResources);
    expect(economy.getResources(SIDE.AI)).toBe(ECONOMY_CONFIG.startingResources);
  });

  it("spend deducts resources when affordable", () => {
    const startResources = economy.getResources(SIDE.PLAYER);
    const result = economy.spend(SIDE.PLAYER, 5);
    expect(result).toBe(true);
    expect(economy.getResources(SIDE.PLAYER)).toBe(startResources - 5);
  });

  it("spend fails when not affordable", () => {
    const result = economy.spend(SIDE.PLAYER, 9999);
    expect(result).toBe(false);
    expect(economy.getResources(SIDE.PLAYER)).toBe(ECONOMY_CONFIG.startingResources);
  });

  it("canAfford checks correctly", () => {
    expect(economy.canAfford(SIDE.PLAYER, 10)).toBe(true);
    expect(economy.canAfford(SIDE.PLAYER, 9999)).toBe(false);
  });

  it("addKillBounty adds correct bonus", () => {
    const before = economy.getResources(SIDE.PLAYER);
    economy.addKillBounty(SIDE.PLAYER, 3);
    expect(economy.getResources(SIDE.PLAYER)).toBe(before + ECONOMY_CONFIG.killBonus * 3);
  });

  it("addKillBounty does nothing for 0 kills", () => {
    const before = economy.getResources(SIDE.PLAYER);
    economy.addKillBounty(SIDE.PLAYER, 0);
    expect(economy.getResources(SIDE.PLAYER)).toBe(before);
  });

  it("getIncomeDetails returns base income with no control points", () => {
    const details = economy.getIncomeDetails(SIDE.PLAYER);
    expect(details.base).toBe(ECONOMY_CONFIG.baseIncome);
    expect(details.pointBonus).toBe(0);
    expect(details.enemyBonus).toBe(0);
    expect(details.total).toBeGreaterThan(0);
  });

  it("getIncomeDetails includes interest on savings", () => {
    ctx.state.setResources(SIDE.PLAYER, 100);
    const details = economy.getIncomeDetails(SIDE.PLAYER);
    // Interest is capped at interestCap
    const expectedInterest = ECONOMY_CONFIG.interestCap * ECONOMY_CONFIG.interestRate * ECONOMY_CONFIG.interestTick;
    expect(details.interest).toBeCloseTo(expectedInterest, 5);
  });

  it("getIncomeDetails caps interest at interestCap", () => {
    ctx.state.setResources(SIDE.PLAYER, 5);
    const details = economy.getIncomeDetails(SIDE.PLAYER);
    const expectedInterest = 5 * ECONOMY_CONFIG.interestRate * ECONOMY_CONFIG.interestTick;
    expect(details.interest).toBeCloseTo(expectedInterest, 5);
  });

  it("getIncomeDetails includes point bonus", () => {
    ctx.state.setControlPoints([
      { owner: SIDE.PLAYER, index: 0 },
      { owner: SIDE.PLAYER, index: 1 },
      { owner: SIDE.AI, index: 3 }
    ]);
    const details = economy.getIncomeDetails(SIDE.PLAYER);
    expect(details.pointBonus).toBe(2 * ECONOMY_CONFIG.pointBonus);
  });

  it("getIncomeDetails includes enemy point bonus for deep points", () => {
    // Player owns point index 3 (enemy territory for player)
    ctx.state.setControlPoints([
      { owner: SIDE.PLAYER, index: 3 }
    ]);
    const details = economy.getIncomeDetails(SIDE.PLAYER);
    expect(details.enemyBonus).toBe(ECONOMY_CONFIG.enemyPointBonus);
  });

  it("isEnemyPoint correctly identifies enemy territory", () => {
    // For player: indices 3+ are enemy territory
    expect(economy.isEnemyPoint(SIDE.PLAYER, 0)).toBe(false);
    expect(economy.isEnemyPoint(SIDE.PLAYER, 2)).toBe(false);
    expect(economy.isEnemyPoint(SIDE.PLAYER, 3)).toBe(true);
    expect(economy.isEnemyPoint(SIDE.PLAYER, 4)).toBe(true);

    // For AI: indices 0-1 are enemy territory
    expect(economy.isEnemyPoint(SIDE.AI, 0)).toBe(true);
    expect(economy.isEnemyPoint(SIDE.AI, 1)).toBe(true);
    expect(economy.isEnemyPoint(SIDE.AI, 2)).toBe(false);
  });

  it("setResources updates resources for a side", () => {
    economy.setResources(SIDE.PLAYER, 999);
    expect(economy.getResources(SIDE.PLAYER)).toBe(999);
  });

  it("update accumulates resources over time", () => {
    const before = economy.getResources(SIDE.PLAYER);
    
    // Simulate passing enough time for one income tick
    economy.update(ECONOMY_CONFIG.interestTick);
    
    // Should have gained at least base income
    expect(economy.getResources(SIDE.PLAYER)).toBeGreaterThan(before);
  });
});
