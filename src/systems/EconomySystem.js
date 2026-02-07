/**
 * EconomySystem - Handles resource management and income.
 * Refactored to use GameContext instead of Scene.
 */

import { SIDE, ECONOMY_CONFIG } from "../config/GameConfig.js";
import { GameEvents } from "../core/EventBus.js";

export default class EconomySystem {
  /**
   * @param {GameContext} ctx - The game context
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.state = ctx.state;
    this.events = ctx.events;
  }

  /**
   * Update economy - called each frame.
   * @param {number} delta - Delta time in seconds
   */
  update(delta) {
    if (this.state.isGameOver) return;

    this.state.resourceAccumulator += delta;

    while (this.state.resourceAccumulator >= ECONOMY_CONFIG.interestTick) {
      this.state.resourceAccumulator -= ECONOMY_CONFIG.interestTick;
      this.gainResources();
    }
  }

  /**
   * Add income to both sides.
   */
  gainResources() {
    const playerIncome = this.getIncomeDetails(SIDE.PLAYER);
    const aiIncome = this.getIncomeDetails(SIDE.AI);

    this.state.addResources(SIDE.PLAYER, playerIncome.total);
    this.state.addResources(SIDE.AI, aiIncome.total);

    this.emitResourceUpdate();

    this.events.emit(GameEvents.INCOME_TICK, {
      player: playerIncome,
      ai: aiIncome
    });
  }

  /**
   * Get resources for a side.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @returns {number} Current resources
   */
  getResources(side) {
    return this.state.getResources(side);
  }

  /**
   * Set resources for a side.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @param {number} value - New resource value
   */
  setResources(side, value) {
    this.state.setResources(side, value);
    this.emitResourceUpdate();
  }

  /**
   * Spend resources.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @param {number} amount - Amount to spend
   * @returns {boolean} Success
   */
  spend(side, amount) {
    const success = this.state.spendResources(side, amount);
    if (success) {
      this.emitResourceUpdate();
    }
    return success;
  }

  /**
   * Check if side can afford amount.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @param {number} amount - Amount to check
   * @returns {boolean} Can afford
   */
  canAfford(side, amount) {
    return this.state.canAfford(side, amount);
  }

  /**
   * Add kill bounty for killed units.
   * @param {string} side - Side that gets the bounty
   * @param {number} count - Number of kills
   */
  addKillBounty(side, count) {
    if (count <= 0) return;

    const bonus = ECONOMY_CONFIG.killBonus * count;
    this.state.addResources(side, bonus);
    this.emitResourceUpdate();
  }

  /**
   * Get detailed income breakdown.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @returns {Object} Income details { base, pointBonus, enemyBonus, interest, total }
   */
  getIncomeDetails(side) {
    const controlPoints = this.state.getControlPoints();
    const ownedPoints = controlPoints.filter((point) => point.owner === side);

    const base = ECONOMY_CONFIG.baseIncome;
    const pointBonus = ownedPoints.length * ECONOMY_CONFIG.pointBonus;

    let enemyBonus = 0;
    for (const point of ownedPoints) {
      if (this.isEnemyPoint(side, point.index)) {
        enemyBonus += ECONOMY_CONFIG.enemyPointBonus;
      }
    }

    const resources = this.state.getResources(side);
    const interestBase = Math.min(resources, ECONOMY_CONFIG.interestCap);
    const interest = interestBase * ECONOMY_CONFIG.interestRate * ECONOMY_CONFIG.interestTick;

    const total = base + pointBonus + enemyBonus + interest;

    return { base, pointBonus, enemyBonus, interest, total };
  }

  /**
   * Check if a control point index is on the enemy side.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @param {number} index - Control point index
   * @returns {boolean} Is enemy point
   */
  isEnemyPoint(side, index) {
    // Assuming 5 control points: 0,1 are player-side, 3,4 are AI-side, 2 is middle
    if (side === SIDE.PLAYER) return index >= 3;
    return index <= 1;
  }

  /**
   * Emit resource update event.
   */
  emitResourceUpdate() {
    this.events.emit(GameEvents.RESOURCES_CHANGED, {
      player: this.state.getResources(SIDE.PLAYER),
      ai: this.state.getResources(SIDE.AI),
      playerIncome: this.getIncomeDetails(SIDE.PLAYER).total,
      aiIncome: this.getIncomeDetails(SIDE.AI).total
    });
  }
}
