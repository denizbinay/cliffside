import { UNIT_TYPES } from "../data/units.js";
import { SIDE, AI_CONFIG } from "../config/GameConfig.js";

export default class AIController {
  constructor(scene) {
    this.scene = scene;
  }

  setup() {
    this.scene.time.addEvent({
      delay: AI_CONFIG.decisionInterval,
      loop: true,
      callback: () => this.decide()
    });
  }

  decide() {
    const { waveManager, shopManager, economy } = this.scene;
    if (this.scene.isGameOver) return;
    if (waveManager.waveLocked) return;

    const aiPoints = this.scene.controlPoints.filter((point) => point.owner === SIDE.AI).length;
    const playerPoints = this.scene.controlPoints.filter((point) => point.owner === SIDE.PLAYER).length;

    let stanceId = "normal";
    if (this.scene.aiCastle.hp < this.scene.playerCastle.hp * AI_CONFIG.defensiveHpThreshold) {
      stanceId = "defensive";
    } else if (aiPoints < playerPoints) {
      stanceId = "aggressive";
    }
    waveManager.selectStance({ id: stanceId }, SIDE.AI);

    const offers = (shopManager.getShop(SIDE.AI)?.offers || []).filter(Boolean);
    if (offers.length === 0) return;

    const draft = waveManager.aiDraft || { front: [], mid: [], rear: [] };
    const queued = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    const queuedRoles = queued.reduce(
      (acc, id) => {
        const role = UNIT_TYPES[id]?.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { frontline: 0, damage: 0, support: 0, disruptor: 0 }
    );

    const stageIndex = waveManager.getStageIndex(this.scene.matchTime || 0);
    const pickOffer = (role) => offers.find((id) => UNIT_TYPES[id]?.role === role);
    const pickAffordable = () => {
      const affordable = offers.filter((id) => UNIT_TYPES[id]?.cost <= economy.aiResources);
      if (affordable.length === 0) return null;
      return affordable.sort((a, b) => UNIT_TYPES[a].cost - UNIT_TYPES[b].cost)[0];
    };

    const needsFrontline = queuedRoles.frontline < 1;
    const needsSupport = queuedRoles.support < 1;

    if (needsFrontline) {
      const id = pickOffer("frontline");
      if (id && waveManager.queueUnit({ id, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) return;
    }

    if (needsSupport) {
      const id = pickOffer("support");
      if (id && waveManager.queueUnit({ id, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) return;
    }

    const disruptor = pickOffer("disruptor");
    if (disruptor && waveManager.queueUnit({ id: disruptor, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) return;

    const damage = pickOffer("damage");
    if (damage && waveManager.queueUnit({ id: damage, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex)) return;

    const fallback = pickAffordable();
    if (fallback) {
      waveManager.queueUnit({ id: fallback, fromShop: true }, SIDE.AI, economy, shopManager, stageIndex);
      return;
    }

    const rerollCost = shopManager.getRerollCost(SIDE.AI);
    if (economy.aiResources >= rerollCost + AI_CONFIG.rerollSafetyBuffer) {
      shopManager.requestReroll(SIDE.AI, economy, stageIndex);
    }
  }
}
