/**
 * EntityManager - CRUD operations for all game entities.
 * Interacts with GameState and emits events via EventBus.
 */

import { GameEvents } from "../core/EventBus.js";
import { createUnitData, isUnitAlive, isUnitReadyForCleanup } from "../entities/UnitData.js";
import { createCastleData, isCastleAlive } from "../entities/CastleData.js";
import { createTurretData, isTurretAlive } from "../entities/TurretData.js";
import { createControlPointData } from "../entities/ControlPointData.js";
import { SIDE } from "../config/GameConfig.js";

export default class EntityManager {
  /**
   * @param {GameContext} ctx - The game context
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.state = ctx.state;
    this.events = ctx.events;
  }

  // --- Unit Management ---

  /**
   * Create and add a unit to the game.
   * @param {Object} options - Unit options (type, side, x, y, modifiers, presenceMult)
   * @returns {Object} Created UnitData
   */
  createUnit(options) {
    const unit = createUnitData(options);
    this.state.addUnit(unit);

    this.events.emit(GameEvents.ENTITY_CREATED, {
      entityType: "unit",
      entity: unit
    });

    this.events.emit(GameEvents.UNIT_SPAWNED, {
      unit,
      side: unit.side,
      type: unit.type
    });

    return unit;
  }

  /**
   * Remove a unit from the game.
   * @param {string} unitId - Unit ID to remove
   * @returns {Object|null} Removed unit or null
   */
  destroyUnit(unitId) {
    const unit = this.state.removeUnit(unitId);
    if (!unit) return null;

    this.events.emit(GameEvents.ENTITY_DESTROYED, {
      entityType: "unit",
      entity: unit
    });

    return unit;
  }

  /**
   * Get all units.
   * @param {string|null} side - Optional side filter
   * @returns {Object[]} Array of units
   */
  getUnits(side = null) {
    return this.state.getUnits(side);
  }

  /**
   * Get all alive units.
   * @param {string|null} side - Optional side filter
   * @returns {Object[]} Array of alive units
   */
  getAliveUnits(side = null) {
    return this.state.getAliveUnits(side);
  }

  /**
   * Cleanup dead units that are ready for removal.
   * @param {number} now - Current timestamp in ms
   * @returns {Object} Cleanup results { playerDead, aiDead }
   */
  cleanupDeadUnits(now) {
    const toRemove = [];
    let playerDead = 0;
    let aiDead = 0;

    for (const unit of this.state.units) {
      if (isUnitReadyForCleanup(unit, now)) {
        toRemove.push(unit);
        if (unit.side === SIDE.PLAYER) playerDead += 1;
        if (unit.side === SIDE.AI) aiDead += 1;
      }
    }

    for (const unit of toRemove) {
      this.destroyUnit(unit.id);
    }

    return { playerDead, aiDead };
  }

  // --- Castle Management ---

  /**
   * Create and set a castle.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @param {Object} options - Castle options (x, y, maxHp, color)
   * @returns {Object} Created CastleData
   */
  createCastle(side, options) {
    const castle = createCastleData({ ...options, side });
    this.state.setCastle(side, castle);

    this.events.emit(GameEvents.ENTITY_CREATED, {
      entityType: "castle",
      entity: castle
    });

    return castle;
  }

  /**
   * Get a castle.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @returns {Object|null} CastleData or null
   */
  getCastle(side) {
    return this.state.getCastle(side);
  }

  // --- Turret Management ---

  /**
   * Create and add a turret.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @param {Object} options - Turret options (x, y, metrics)
   * @returns {Object} Created TurretData
   */
  createTurret(side, options) {
    const turret = createTurretData({ ...options, side });
    this.state.addTurret(side, turret);

    this.events.emit(GameEvents.ENTITY_CREATED, {
      entityType: "turret",
      entity: turret
    });

    return turret;
  }

  /**
   * Get turrets for a side.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @returns {Object[]} Array of turrets
   */
  getTurrets(side) {
    return this.state.getTurrets(side);
  }

  /**
   * Get alive turrets for a side.
   * @param {string} side - SIDE.PLAYER or SIDE.AI
   * @returns {Object[]} Array of alive turrets
   */
  getAliveTurrets(side) {
    return this.state.getAliveTurrets(side);
  }

  // --- Control Point Management ---

  /**
   * Create control points.
   * @param {Object[]} pointConfigs - Array of { index, x, y, zoneWidth, zoneHeight }
   * @returns {Object[]} Created control points
   */
  createControlPoints(pointConfigs) {
    const points = pointConfigs.map((config) => createControlPointData(config));
    this.state.setControlPoints(points);

    for (const point of points) {
      this.events.emit(GameEvents.ENTITY_CREATED, {
        entityType: "controlPoint",
        entity: point
      });
    }

    return points;
  }

  /**
   * Get all control points.
   * @returns {Object[]} Array of control points
   */
  getControlPoints() {
    return this.state.getControlPoints();
  }

  /**
   * Get control points owned by a side.
   * @param {string} owner - SIDE.PLAYER, SIDE.AI, or "neutral"
   * @returns {Object[]} Array of control points
   */
  getControlPointsByOwner(owner) {
    return this.state.getControlPointsByOwner(owner);
  }

  // --- Entity Queries ---

  /**
   * Find a target unit within range.
   * @param {Object} attacker - Unit or turret data
   * @param {Object[]} enemies - Array of enemy units
   * @returns {Object|null} Closest enemy in range or null
   */
  findTargetInRange(attacker, enemies) {
    let closest = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (!isUnitAlive(enemy)) continue;

      const dist = Math.abs(enemy.x - attacker.x);
      if (dist <= attacker.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }

  /**
   * Find the best heal target (ally with most missing HP in range).
   * @param {Object} healer - Support unit data
   * @param {Object[]} allies - Array of ally units
   * @returns {Object|null} Best heal target or null
   */
  findHealTarget(healer, allies) {
    let best = null;
    let maxMissing = 0;

    for (const ally of allies) {
      if (!isUnitAlive(ally)) continue;

      const dist = Math.abs(ally.x - healer.x);
      const missing = ally.maxHp - ally.hp;

      if (dist <= healer.range && missing > maxMissing) {
        maxMissing = missing;
        best = ally;
      }
    }

    return best;
  }

  /**
   * Get units in a rectangular zone.
   * @param {Object} zone - { x, y, width, height }
   * @param {string|null} side - Optional side filter
   * @returns {Object[]} Units in the zone
   */
  getUnitsInZone(zone, side = null) {
    const units = this.getAliveUnits(side);
    return units.filter((unit) => {
      return (
        unit.x >= zone.x &&
        unit.x <= zone.x + zone.width &&
        unit.y >= zone.y &&
        unit.y <= zone.y + zone.height
      );
    });
  }
}
