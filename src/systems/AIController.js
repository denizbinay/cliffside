/**
 * AIController - Handles AI decision making.
 * Refactored to use GameContext instead of Scene.
 */

import { UNIT_TYPES } from "../data/units.js";
import { SIDE, AI_CONFIG } from "../config/GameConfig.js";
import { isCastleAlive } from "../entities/CastleData.js";

export default class AIController {
  /**
   * @param {GameContext} ctx - The game context
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.state = ctx.state;
    this.events = ctx.events;

    this.decisionTimer = 0;
  }

  /**
   * Update AI - called each frame.
   * @param {number} delta - Delta time in seconds
   */
  update(delta) {
    if (this.state.isGameOver) return;

    this.decisionTimer += delta * 1000; // Convert to ms

    if (this.decisionTimer >= AI_CONFIG.decisionInterval) {
      this.decisionTimer = 0;
      this.decide();
    }
  }

  /**
   * Make a decision about what to do.
   */
  decide() {
    const waveManager = this.ctx.getSystem("wave");
    const shopManager = this.ctx.getSystem("shop");
    const economy = this.ctx.getSystem("economy");

    if (!waveManager || !shopManager || !economy) return;
    if (this.state.isGameOver) return;
    if (this.state.waveLocked) return;

    const controlPoints = this.state.getControlPoints();
    const aiPoints = controlPoints.filter((point) => point.owner === SIDE.AI).length;
    const playerPoints = controlPoints.filter((point) => point.owner === SIDE.PLAYER).length;

    const playerCastle = this.state.getCastle(SIDE.PLAYER);
    const aiCastle = this.state.getCastle(SIDE.AI);

    // Determine stance
    let stanceId = "normal";
    if (aiCastle && playerCastle) {
      if (aiCastle.hp < playerCastle.hp * AI_CONFIG.defensiveHpThreshold) {
        stanceId = "defensive";
      } else if (aiPoints < playerPoints) {
        stanceId = "aggressive";
      }
    }
    waveManager.selectStance({ id: stanceId }, SIDE.AI);

    // Get available offers
    const offers = (shopManager.getShop(SIDE.AI)?.offers || []).filter(Boolean);
    if (offers.length === 0) return;

    // Check current draft
    const draft = waveManager.getDraft(SIDE.AI);
    const queued = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    const queuedRoles = queued.reduce(
      (acc, id) => {
        const role = UNIT_TYPES[id]?.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { frontline: 0, damage: 0, support: 0, disruptor: 0 }
    );

    const stageIndex = waveManager.getStageIndex(this.state.matchTime || 0);
    const aiResources = this.state.getResources(SIDE.AI);

    const pickOffer = (role) => offers.find((id) => UNIT_TYPES[id]?.role === role);
    const pickAffordable = () => {
      const affordable = offers.filter((id) => UNIT_TYPES[id]?.cost <= aiResources);
      if (affordable.length === 0) return null;
      return affordable.sort((a, b) => UNIT_TYPES[a].cost - UNIT_TYPES[b].cost)[0];
    };

    const needsFrontline = queuedRoles.frontline < 1;
    const needsSupport = queuedRoles.support < 1;

    // Priority: Frontline > Support > Disruptor > Damage > Affordable > Reroll
    if (needsFrontline) {
      const id = pickOffer("frontline");
      if (id && waveManager.queueUnit({ id, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) {
        return;
      }
    }

    if (needsSupport) {
      const id = pickOffer("support");
      if (id && waveManager.queueUnit({ id, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) {
        return;
      }
    }

    const disruptor = pickOffer("disruptor");
    if (disruptor && waveManager.queueUnit({ id: disruptor, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) {
      return;
    }

    const damage = pickOffer("damage");
    if (damage && waveManager.queueUnit({ id: damage, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) {
      return;
    }

    const fallback = pickAffordable();
    if (fallback) {
      waveManager.queueUnit({ id: fallback, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex);
      return;
    }

    // Consider rerolling
    const rerollCost = shopManager.getRerollCost(SIDE.AI);
    if (aiResources >= rerollCost + AI_CONFIG.rerollSafetyBuffer) {
      shopManager.requestReroll(SIDE.AI, economy, stageIndex);
    }
  }
}
