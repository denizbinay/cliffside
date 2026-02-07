/**
 * QueueUnitCommand - Encapsulates adding a unit to the wave draft.
 */

import Command from "./Command.js";
import { UNIT_TYPES } from "../data/units.js";

export default class QueueUnitCommand extends Command {
  /**
   * @param {GameContext} ctx - The game context
   * @param {Object} options - { type, side, slot, index, fromShop }
   */
  constructor(ctx, options) {
    super(ctx);
    this.type = options.type;
    this.side = options.side;
    this.slot = options.slot || null;
    this.index = options.index ?? null;
    this.fromShop = options.fromShop ?? true;

    // For undo
    this.actualSlot = null;
    this.actualIndex = null;
    this.costPaid = 0;
  }

  canExecute() {
    if (this.ctx.state.isGameOver) return false;
    if (this.ctx.state.waveLocked) return false;

    const config = UNIT_TYPES[this.type];
    if (!config) return false;

    const economy = this.ctx.getSystem("economy");
    if (!economy || !economy.canAfford(this.side, config.cost)) return false;

    if (this.fromShop) {
      const shop = this.ctx.getSystem("shop");
      if (!shop || !shop.isUnitAvailable(this.side, this.type)) return false;
    }

    return true;
  }

  execute() {
    if (!this.canExecute()) return false;

    const waveManager = this.ctx.getSystem("wave");
    const economy = this.ctx.getSystem("economy");
    const shop = this.ctx.getSystem("shop");

    if (!waveManager || !economy) return false;

    const stageIndex = waveManager.getStageIndex(this.ctx.state.matchTime || 0);

    const success = waveManager.queueUnit(
      {
        id: this.type,
        slot: this.slot,
        index: this.index,
        fromShop: this.fromShop
      },
      this.side,
      economy,
      shop,
      stageIndex
    );

    if (success) {
      this.executed = true;
      this.costPaid = UNIT_TYPES[this.type].cost;
      // Note: actual slot/index tracking would require WaveManager to return them
    }

    return success;
  }

  undo() {
    if (!this.executed) return false;

    const waveManager = this.ctx.getSystem("wave");
    if (!waveManager) return false;

    // Remove the unit from draft
    const removed = waveManager.removeQueuedUnit(
      { id: this.type, slot: this.actualSlot, index: this.actualIndex },
      this.side
    );

    if (removed) {
      // Refund cost
      if (this.costPaid > 0) {
        this.ctx.state.addResources(this.side, this.costPaid);
        const economy = this.ctx.getSystem("economy");
        if (economy) economy.emitResourceUpdate();
      }

      this.executed = false;
      return true;
    }

    return false;
  }

  describe() {
    return `QueueUnit(${this.type}, ${this.side})`;
  }
}
