/**
 * CastAbilityCommand - Encapsulates ability casting.
 */

import Command from "./Command.js";
import { ABILITIES } from "../data/abilities.js";
import { SIDE } from "../config/GameConfig.js";
import { GameEvents } from "../core/EventBus.js";
import { healUnit, applyStatusToUnit, isUnitAlive } from "../entities/UnitData.js";

export default class CastAbilityCommand extends Command {
  /**
   * @param {GameContext} ctx - The game context
   * @param {Object} options - { abilityId, side }
   */
  constructor(ctx, options) {
    super(ctx);
    this.abilityId = options.abilityId;
    this.side = options.side || SIDE.PLAYER;
  }

  canExecute() {
    if (this.ctx.state.isGameOver) return false;

    const ability = ABILITIES[this.abilityId];
    if (!ability) return false;

    const cooldown = this.ctx.state.abilityCooldowns[this.abilityId];
    if (cooldown > 0) return false;

    return true;
  }

  execute() {
    if (!this.canExecute()) return false;

    const ability = ABILITIES[this.abilityId];

    // Set cooldown
    this.ctx.state.abilityCooldowns[this.abilityId] = ability.cooldown;

    // Execute ability effect
    switch (this.abilityId) {
      case "healWave":
        this.executeHealWave(ability);
        break;
      case "pulse":
        this.executePulse(ability);
        break;
      default:
        return false;
    }

    this.executed = true;

    // Emit ability cast event
    this.ctx.events.emit(GameEvents.ABILITY_CAST, {
      abilityId: this.abilityId,
      side: this.side,
      ability
    });

    this.ctx.events.emit(GameEvents.LOG, {
      type: "ability",
      name: ability.name
    });

    return true;
  }

  executeHealWave(ability) {
    const castle = this.ctx.state.getCastle(this.side);
    const units = this.ctx.state.getAliveUnits(this.side);

    // Heal all allied units
    for (const unit of units) {
      const healed = healUnit(unit, ability.amount);
      if (healed > 0) {
        this.ctx.events.emit(GameEvents.UNIT_HEALED, {
          unit,
          amount: healed,
          source: "ability"
        });
      }
    }

    // Visual effect
    this.ctx.events.emit(GameEvents.EFFECT_ABILITY_VISUAL, {
      type: "healWave",
      x: castle?.x || 100,
      y: castle?.y || 300,
      radius: 400
    });
  }

  executePulse(ability) {
    const castle = this.ctx.state.getCastle(this.side);
    const levelManager = this.ctx.getManager("level");

    // Get platform zone for effect area
    const zone = levelManager?.getPlatformZone?.(this.side, 40) || {
      x: this.side === SIDE.PLAYER ? 70 : 1070,
      y: 370,
      width: 180,
      height: 90
    };

    const enemySide = this.side === SIDE.PLAYER ? SIDE.AI : SIDE.PLAYER;
    const enemies = this.ctx.state.getAliveUnits(enemySide);

    // Apply stun and pushback to enemies in zone
    for (const unit of enemies) {
      if (this.isInZone(unit, zone)) {
        applyStatusToUnit(unit, { type: "stun", duration: ability.stunDuration }, this.side);
        applyStatusToUnit(unit, { type: "pushback", strength: ability.pushStrength }, this.side);

        this.ctx.events.emit(GameEvents.UNIT_STATUS_APPLIED, {
          unit,
          status: { type: "stun", duration: ability.stunDuration },
          source: "ability"
        });
      }
    }

    // Visual effect
    this.ctx.events.emit(GameEvents.EFFECT_ABILITY_VISUAL, {
      type: "pulse",
      x: castle?.x || (this.side === SIDE.PLAYER ? 100 : 1180),
      y: castle?.y || 300,
      radius: zone.width * 0.6
    });
  }

  isInZone(unit, zone) {
    return (
      unit.x >= zone.x &&
      unit.x <= zone.x + zone.width &&
      unit.y >= zone.y &&
      unit.y <= zone.y + zone.height
    );
  }

  undo() {
    // Abilities cannot be undone
    return false;
  }

  describe() {
    return `CastAbility(${this.abilityId}, ${this.side})`;
  }
}
