/**
 * CastleData - Pure data representation of a castle.
 * No Phaser imports. All rendering is handled by CastleRenderer.
 */

import { CASTLE_CONFIG } from "../config/GameConfig.js";

/**
 * Factory function to create a castle data object.
 * @param {Object} options - Castle configuration
 * @returns {Object} CastleData object
 */
export function createCastleData(options) {
  const {
    id = null,
    side,
    x,
    y,
    maxHp = CASTLE_CONFIG.maxHp,
    color = side === "player" ? 0x5f7685 : 0x8a5a5a
  } = options;

  return {
    // Identity
    id,
    side,
    entityType: "castle",

    // Position
    x,
    y,

    // Stats
    maxHp,
    hp: maxHp,

    // Visual metadata
    color,

    // Dirty flags
    dirty: true,
    healthDirty: true
  };
}

/**
 * Check if castle is alive.
 * @param {Object} castle - CastleData object
 * @returns {boolean}
 */
export function isCastleAlive(castle) {
  return castle.hp > 0;
}

/**
 * Apply damage to a castle.
 * @param {Object} castle - CastleData object
 * @param {number} amount - Damage amount
 * @returns {Object} Result with isDestroyed flag
 */
export function damageCastle(castle, amount) {
  if (!isCastleAlive(castle)) return { isDestroyed: true, overkill: 0 };

  const prevHp = castle.hp;
  castle.hp = Math.max(0, castle.hp - amount);
  castle.healthDirty = true;
  castle.dirty = true;

  const isDestroyed = castle.hp <= 0;
  const overkill = isDestroyed ? amount - prevHp : 0;

  return { isDestroyed, overkill, damage: prevHp - castle.hp };
}

/**
 * Heal a castle.
 * @param {Object} castle - CastleData object
 * @param {number} amount - Heal amount
 * @returns {number} Actual amount healed
 */
export function healCastle(castle, amount) {
  if (!isCastleAlive(castle)) return 0;

  const prevHp = castle.hp;
  castle.hp = Math.min(castle.maxHp, castle.hp + amount);
  castle.healthDirty = true;
  castle.dirty = true;

  return castle.hp - prevHp;
}

/**
 * Get HP ratio for UI display.
 * @param {Object} castle - CastleData object
 * @returns {number} HP ratio between 0 and 1
 */
export function getCastleHpRatio(castle) {
  return Math.max(0, Math.min(1, castle.hp / castle.maxHp));
}

/**
 * Clear dirty flags after render sync.
 * @param {Object} castle - CastleData object
 */
export function clearCastleDirtyFlags(castle) {
  castle.dirty = false;
  castle.healthDirty = false;
}
