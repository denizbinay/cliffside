import { describe, it, expect, beforeEach } from "vitest";
import { SIDE } from "../src/config/GameConfig.js";
import { SHOP_CONFIG } from "../src/data/shop.js";
import ShopManager from "../src/systems/ShopManager.js";
import GameContext from "../src/core/GameContext.js";

function createMockContext() {
  const ctx = new GameContext();
  ctx.state.setControlPoints([]);
  return ctx;
}

describe("ShopManager", () => {
  let shop;
  let ctx;

  beforeEach(() => {
    ctx = createMockContext();
    shop = new ShopManager(ctx);
  });

  it("initializes with empty offers for both sides", () => {
    expect(shop.getShop(SIDE.PLAYER).offers).toEqual([]);
    expect(shop.getShop(SIDE.AI).offers).toEqual([]);
  });

  it("rollOffers generates correct number of offers", () => {
    shop.rollOffers(SIDE.PLAYER, 0, true);
    expect(shop.getShop(SIDE.PLAYER).offers.length).toBe(SHOP_CONFIG.offersPerWave);
  });

  it("rollOffers resets rerolls when requested", () => {
    shop.getShop(SIDE.PLAYER).rerolls = 5;
    shop.rollOffers(SIDE.PLAYER, 0, true);
    expect(shop.getShop(SIDE.PLAYER).rerolls).toBe(0);
  });

  it("rollOffers does not reset rerolls when not requested", () => {
    shop.getShop(SIDE.PLAYER).rerolls = 5;
    shop.rollOffers(SIDE.PLAYER, 0, false);
    expect(shop.getShop(SIDE.PLAYER).rerolls).toBe(5);
  });

  it("getRerollCost increases with rerolls", () => {
    const baseCost = shop.getRerollCost(SIDE.PLAYER);
    shop.getShop(SIDE.PLAYER).rerolls = 3;
    const cost3 = shop.getRerollCost(SIDE.PLAYER);
    expect(cost3).toBe(baseCost + 3 * SHOP_CONFIG.rerollCostGrowth);
  });

  it("isUnitAvailable correctly checks offers", () => {
    shop.rollOffers(SIDE.PLAYER, 0, true);
    const offerId = shop.getShop(SIDE.PLAYER).offers[0];
    expect(shop.isUnitAvailable(SIDE.PLAYER, offerId)).toBe(true);
    expect(shop.isUnitAvailable(SIDE.PLAYER, "nonexistent_unit")).toBe(false);
  });

  it("claimOffer removes the unit from offers", () => {
    shop.rollOffers(SIDE.PLAYER, 0, true);
    const offerId = shop.getShop(SIDE.PLAYER).offers[0];
    const result = shop.claimOffer(SIDE.PLAYER, offerId);
    expect(result).toBe(true);
    expect(shop.getShop(SIDE.PLAYER).offers[0]).toBeNull();
  });

  it("claimOffer fails for non-existent unit", () => {
    shop.rollOffers(SIDE.PLAYER, 0, true);
    const result = shop.claimOffer(SIDE.PLAYER, "nonexistent_unit");
    expect(result).toBe(false);
  });

  it("isSoldOut detects all-null offers", () => {
    shop.rollOffers(SIDE.PLAYER, 0, true);
    expect(shop.isSoldOut(SIDE.PLAYER)).toBe(false);

    const offers = shop.getShop(SIDE.PLAYER).offers;
    for (let i = 0; i < offers.length; i++) {
      offers[i] = null;
    }
    expect(shop.isSoldOut(SIDE.PLAYER)).toBe(true);
  });

  it("getTierCap returns correct cap per stage", () => {
    expect(shop.getTierCap(0)).toBe(SHOP_CONFIG.stageTierCaps[0]);
    expect(shop.getTierCap(1)).toBe(SHOP_CONFIG.stageTierCaps[1]);
    expect(shop.getTierCap(2)).toBe(SHOP_CONFIG.stageTierCaps[2]);
  });

  it("getEligibleUnits filters by stage and tier", () => {
    const stage0 = shop.getEligibleUnits(0);
    const stage2 = shop.getEligibleUnits(2);
    // Stage 2 should have more or equal units than stage 0
    expect(stage2.length).toBeGreaterThanOrEqual(stage0.length);
    // All stage 0 units should be tier 1 only
    for (const unit of stage0) {
      expect(unit.tier).toBeLessThanOrEqual(SHOP_CONFIG.stageTierCaps[0]);
      expect(unit.stageMin).toBeLessThanOrEqual(0);
    }
  });
});
