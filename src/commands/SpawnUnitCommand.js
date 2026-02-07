/**
 * SpawnUnitCommand - Encapsulates direct unit spawning (dev mode).
 */

import Command from "./Command.js";
import { UNIT_TYPES } from "../data/units.js";
import { GameEvents } from "../core/EventBus.js";

export default class SpawnUnitCommand extends Command {
  /**
   * @param {GameContext} ctx - The game context
   * @param {Object} options - { type, side, x, y, payCost, modifiers }
   */
  constructor(ctx, options) {
    super(ctx);
    this.type = options.type;
    this.side = options.side;
    this.x = options.x;
    this.y = options.y;
    this.payCost = options.payCost ?? true;
    this.modifiers = options.modifiers || {};
    this.presenceMult = options.presenceMult || 1;

    this.createdUnitId = null;
  }

  canExecute() {
    if (this.ctx.state.isGameOver) return false;

    const config = UNIT_TYPES[this.type];
    if (!config) return false;

    if (this.payCost) {
      const economy = this.ctx.getSystem("economy");
      if (!economy || !economy.canAfford(this.side, config.cost)) return false;
    }

    return true;
  }

  execute() {
    if (!this.canExecute()) return false;

    const config = UNIT_TYPES[this.type];
    const economy = this.ctx.getSystem("economy");
    const entityManager = this.ctx.getManager("entity");

    if (!entityManager) return false;

    // Pay cost if required
    if (this.payCost && economy) {
      if (!economy.spend(this.side, config.cost)) return false;
    }

    // Create unit
    const unit = entityManager.createUnit({
      type: this.type,
      side: this.side,
      x: this.x,
      y: this.y,
      presenceMult: this.presenceMult,
      modifiers: this.modifiers
    });

    this.createdUnitId = unit.id;
    this.executed = true;

    // Emit effects
    this.ctx.events.emit(GameEvents.EFFECT_SPAWN_PULSE, {
      x: this.x,
      y: this.y,
      color: config.color
    });

    this.ctx.events.emit(GameEvents.LOG, {
      type: "spawn",
      side: this.side,
      name: config.name
    });

    return true;
  }

  undo() {
    if (!this.executed || !this.createdUnitId) return false;

    const entityManager = this.ctx.getManager("entity");
    if (!entityManager) return false;

    // Remove the unit
    const removed = entityManager.destroyUnit(this.createdUnitId);
    if (!removed) return false;

    // Refund cost if it was paid
    if (this.payCost) {
      const config = UNIT_TYPES[this.type];
      const economy = this.ctx.getSystem("economy");
      if (economy && config) {
        this.ctx.state.addResources(this.side, config.cost);
        economy.emitResourceUpdate();
      }
    }

    this.executed = false;
    this.createdUnitId = null;

    return true;
  }

  describe() {
    return `SpawnUnit(${this.type}, ${this.side})`;
  }
}
