import { UNIT_TYPES } from "../data/units.js";
import { SHOP_CONFIG } from "../data/shop.js";
import { SIDE } from "../config/GameConfig.js";

export default class ShopManager {
  constructor(scene) {
    this.scene = scene;
    this.shops = {
      [SIDE.PLAYER]: { offers: [], rerolls: 0 },
      [SIDE.AI]: { offers: [], rerolls: 0 }
    };
  }

  get player() {
    return this.shops[SIDE.PLAYER];
  }

  get ai() {
    return this.shops[SIDE.AI];
  }

  getShop(side) {
    return this.shops[side];
  }

  getTierCap(stageIndex) {
    const caps = SHOP_CONFIG.stageTierCaps;
    return caps[Math.min(stageIndex, caps.length - 1)];
  }

  getEligibleUnits(stageIndex) {
    const tierCap = this.getTierCap(stageIndex);
    return Object.values(UNIT_TYPES).filter(
      (unit) => unit.stageMin <= stageIndex && unit.tier <= tierCap
    );
  }

  pickWeighted(units) {
    const total = units.reduce((sum, unit) => sum + (unit.shopWeight || 1), 0);
    let roll = Math.random() * total;
    for (const unit of units) {
      roll -= unit.shopWeight || 1;
      if (roll <= 0) return unit;
    }
    return units[units.length - 1];
  }

  rollOffers(side, stageIndex, resetRerolls = false) {
    const shop = this.shops[side];
    if (!shop) return;
    if (resetRerolls) shop.rerolls = 0;

    const eligible = this.getEligibleUnits(stageIndex);
    if (eligible.length === 0) {
      shop.offers = [];
      return;
    }

    const offers = [];
    let pool = [...eligible];
    const guarantees = stageIndex === 0 ? SHOP_CONFIG.earlyRoleGuarantees : [];

    for (const role of guarantees) {
      const rolePool = pool.filter((unit) => unit.role === role);
      if (rolePool.length === 0) continue;
      const pick = this.pickWeighted(rolePool);
      offers.push(pick.id);
      pool = pool.filter((unit) => unit.id !== pick.id);
    }

    while (offers.length < SHOP_CONFIG.offersPerWave && pool.length > 0) {
      const pick = this.pickWeighted(pool);
      offers.push(pick.id);
      pool = pool.filter((unit) => unit.id !== pick.id);
    }

    while (offers.length < SHOP_CONFIG.offersPerWave) {
      const pick = this.pickWeighted(eligible);
      offers.push(pick.id);
    }

    shop.offers = offers;
  }

  getRerollCost(side) {
    const shop = this.shops[side];
    if (!shop) return SHOP_CONFIG.baseRerollCost;
    return SHOP_CONFIG.baseRerollCost + shop.rerolls * SHOP_CONFIG.rerollCostGrowth;
  }

  requestReroll(side, economy, stageIndex) {
    if (this.scene.isGameOver) return false;
    if (this.scene.waveLocked) return false;
    const cost = this.getRerollCost(side);
    if (!economy.spend(side, cost)) return false;
    this.shops[side].rerolls += 1;
    this.rollOffers(side, stageIndex, false);
    economy.emitResourceUpdate();
    return true;
  }

  isUnitAvailable(side, type) {
    const shop = this.shops[side];
    if (!shop) return false;
    return shop.offers.includes(type);
  }

  claimOffer(side, type) {
    const shop = this.shops[side];
    if (!shop) return false;
    const index = shop.offers.indexOf(type);
    if (index === -1) return false;
    shop.offers[index] = null;
    return true;
  }

  isSoldOut(side) {
    const shop = this.shops[side];
    if (!shop || !Array.isArray(shop.offers) || shop.offers.length === 0) return false;
    return shop.offers.every((offer) => !offer);
  }
}
