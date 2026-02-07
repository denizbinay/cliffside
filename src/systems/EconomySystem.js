import { SIDE, ECONOMY_CONFIG } from "../config/GameConfig.js";

export default class EconomySystem {
  constructor(scene) {
    this.scene = scene;
    this.playerResources = ECONOMY_CONFIG.startingResources;
    this.aiResources = ECONOMY_CONFIG.startingResources;
    this.resourceAccumulator = 0;
  }

  update(delta) {
    this.resourceAccumulator += delta;
    while (this.resourceAccumulator >= ECONOMY_CONFIG.interestTick) {
      this.resourceAccumulator -= ECONOMY_CONFIG.interestTick;
      this.gainResources();
    }
  }

  gainResources() {
    const playerIncome = this.getIncomeDetails(SIDE.PLAYER);
    const aiIncome = this.getIncomeDetails(SIDE.AI);

    this.playerResources += playerIncome.total;
    this.aiResources += aiIncome.total;
    this.emitResourceUpdate();
  }

  getResources(side) {
    return side === SIDE.PLAYER ? this.playerResources : this.aiResources;
  }

  setResources(side, value) {
    if (side === SIDE.PLAYER) {
      this.playerResources = value;
    } else {
      this.aiResources = value;
    }
  }

  spend(side, amount) {
    if (side === SIDE.PLAYER) {
      if (this.playerResources < amount) return false;
      this.playerResources -= amount;
    } else {
      if (this.aiResources < amount) return false;
      this.aiResources -= amount;
    }
    return true;
  }

  canAfford(side, amount) {
    return this.getResources(side) >= amount;
  }

  addKillBounty(side, count) {
    const bonus = ECONOMY_CONFIG.killBonus * count;
    if (side === SIDE.PLAYER) {
      this.playerResources += bonus;
    } else {
      this.aiResources += bonus;
    }
    if (count > 0) this.emitResourceUpdate();
  }

  getIncomeDetails(side) {
    const controlPoints = this.scene.controlPoints || [];
    const ownedPoints = controlPoints.filter((point) => point.owner === side);
    const base = ECONOMY_CONFIG.baseIncome;
    const pointBonus = ownedPoints.length * ECONOMY_CONFIG.pointBonus;
    let enemyBonus = 0;

    for (const point of ownedPoints) {
      if (this.isEnemyPoint(side, point.index)) {
        enemyBonus += ECONOMY_CONFIG.enemyPointBonus;
      }
    }

    const resources = this.getResources(side);
    const interestBase = Math.min(resources, ECONOMY_CONFIG.interestCap);
    const interest = interestBase * ECONOMY_CONFIG.interestRate * ECONOMY_CONFIG.interestTick;
    const total = base + pointBonus + enemyBonus + interest;

    return { base, pointBonus, enemyBonus, interest, total };
  }

  isEnemyPoint(side, index) {
    if (side === SIDE.PLAYER) return index >= 3;
    return index <= 1;
  }

  emitResourceUpdate() {
    this.scene.events.emit("resource-update", {
      player: this.playerResources,
      ai: this.aiResources,
      playerIncome: this.getIncomeDetails(SIDE.PLAYER).total,
      aiIncome: this.getIncomeDetails(SIDE.AI).total
    });
  }
}
