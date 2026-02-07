/**
 * UnitData - Pure data representation of a unit.
 * No Phaser imports. All rendering is handled by UnitRenderer.
 */

import { UNIT_SIZE, COMBAT_CONFIG } from "../config/GameConfig.js";
import { UNIT_TYPES } from "../data/units.js";

/**
 * Factory function to create a unit data object.
 * @param {Object} options - Unit configuration
 * @returns {Object} UnitData object
 */
export function createUnitData(options) {
  const {
    id = null,
    type,
    side,
    x,
    y,
    modifiers = {},
    presenceMult = 1
  } = options;

  const config = UNIT_TYPES[type];
  if (!config) {
    throw new Error(`Unknown unit type: ${type}`);
  }

  const hpMult = modifiers.hpMult || 1;
  const dmgMult = modifiers.dmgMult || 1;
  const rangeMult = modifiers.rangeMult || 1;
  const speedMult = modifiers.speedMult || 1;
  const attackRateMult = modifiers.attackRateMult || 1;
  const healMult = modifiers.healMult || 1;

  const maxHp = config.hp * hpMult;

  return {
    // Identity
    id,
    type,
    side,
    entityType: "unit",

    // Position
    x,
    y,

    // Stats (computed from config + modifiers)
    maxHp,
    hp: maxHp,
    dmg: config.dmg * dmgMult,
    range: config.range * rangeMult,
    baseSpeed: config.speed * speedMult,
    attackRate: config.attackRate * attackRateMult,
    attackCooldown: 0,
    healAmount: (config.healAmount || 0) * healMult,

    // Role and presence
    role: config.role,
    presenceMult,

    // Status effects
    status: {
      stun: 0,
      slow: 0,
      slowPower: 1,
      buff: 0,
      buffPower: 1
    },

    // Visual metadata (for renderer)
    size: UNIT_SIZE[config.role] || UNIT_SIZE.default,
    color: config.color,

    // Death state
    deathStarted: false,
    deathAnimDone: false,
    deathCleanupAt: 0,

    // Reference to original config
    config,

    // Dirty flags for optimization
    dirty: true,
    positionDirty: true,
    healthDirty: true,
    statusDirty: true
  };
}

/**
 * Check if unit is alive.
 * @param {Object} unit - UnitData object
 * @returns {boolean}
 */
export function isUnitAlive(unit) {
  return unit.hp > 0;
}

/**
 * Check if unit is ready for cleanup (dead and animation complete).
 * @param {Object} unit - UnitData object
 * @param {number} now - Current time in ms
 * @returns {boolean}
 */
export function isUnitReadyForCleanup(unit, now) {
  if (isUnitAlive(unit)) return false;
  if (!unit.deathStarted) return true;
  if (unit.deathAnimDone) return true;
  return now >= unit.deathCleanupAt;
}

/**
 * Apply damage to a unit.
 * @param {Object} unit - UnitData object
 * @param {number} amount - Damage amount
 * @returns {Object} Result with isDead flag
 */
export function damageUnit(unit, amount) {
  if (!isUnitAlive(unit)) return { isDead: true, overkill: 0 };

  const prevHp = unit.hp;
  unit.hp = Math.max(0, unit.hp - amount);
  unit.healthDirty = true;
  unit.dirty = true;

  const isDead = unit.hp <= 0;
  const overkill = isDead ? amount - prevHp : 0;

  return { isDead, overkill, damage: prevHp - unit.hp };
}

/**
 * Heal a unit.
 * @param {Object} unit - UnitData object
 * @param {number} amount - Heal amount
 * @returns {number} Actual amount healed
 */
export function healUnit(unit, amount) {
  if (!isUnitAlive(unit)) return 0;

  const prevHp = unit.hp;
  unit.hp = Math.min(unit.maxHp, unit.hp + amount);
  unit.healthDirty = true;
  unit.dirty = true;

  return unit.hp - prevHp;
}

/**
 * Apply a status effect to a unit.
 * @param {Object} unit - UnitData object
 * @param {Object} status - Status effect { type, duration, power, strength }
 * @param {string} attackerSide - Side of the attacker (for pushback direction)
 */
export function applyStatusToUnit(unit, status, attackerSide) {
  if (!isUnitAlive(unit)) return;

  unit.statusDirty = true;
  unit.dirty = true;

  if (status.type === "stun") {
    unit.status.stun = Math.max(unit.status.stun, status.duration);
  }
  if (status.type === "slow") {
    unit.status.slow = Math.max(unit.status.slow, status.duration);
    unit.status.slowPower = status.power;
  }
  if (status.type === "pushback") {
    const dir = attackerSide === "player" ? 1 : -1;
    unit.x += dir * status.strength;
    unit.status.stun = Math.max(unit.status.stun, 0.3);
    unit.positionDirty = true;
  }
  if (status.type === "buff") {
    unit.status.buff = Math.max(unit.status.buff, status.duration);
    unit.status.buffPower = status.power;
  }
}

/**
 * Update unit status timers (call each frame).
 * @param {Object} unit - UnitData object
 * @param {number} delta - Delta time in seconds
 */
export function updateUnitTimers(unit, delta) {
  if (!isUnitAlive(unit)) return;

  unit.attackCooldown = Math.max(0, unit.attackCooldown - delta);

  const hadStatus = unit.status.stun > 0 || unit.status.slow > 0 || unit.status.buff > 0;

  unit.status.stun = Math.max(0, unit.status.stun - delta);
  unit.status.slow = Math.max(0, unit.status.slow - delta);
  unit.status.buff = Math.max(0, unit.status.buff - delta);

  const hasStatus = unit.status.stun > 0 || unit.status.slow > 0 || unit.status.buff > 0;

  if (hadStatus !== hasStatus) {
    unit.statusDirty = true;
    unit.dirty = true;
  }
}

/**
 * Move a unit toward a target.
 * @param {Object} unit - UnitData object
 * @param {number} delta - Delta time in seconds
 * @param {number} targetX - Target X position (enemy castle)
 * @param {number} stopDistance - Distance from target to stop
 */
export function moveUnit(unit, delta, targetX, stopDistance = 40) {
  if (!isUnitAlive(unit)) return;
  if (unit.status.stun > 0) return;

  const speed = unit.baseSpeed * (unit.status.slow > 0 ? unit.status.slowPower : 1);
  const dir = unit.side === "player" ? 1 : -1;

  unit.x += dir * speed * delta;

  // Stop at castle
  const stopX = targetX + (unit.side === "player" ? -stopDistance : stopDistance);
  if ((dir === 1 && unit.x > stopX) || (dir === -1 && unit.x < stopX)) {
    unit.x = stopX;
  }

  unit.positionDirty = true;
  unit.dirty = true;
}

/**
 * Get effective damage multiplier from buffs.
 * @param {Object} unit - UnitData object
 * @returns {number} Damage multiplier
 */
export function getUnitDamageMult(unit) {
  return unit.status.buff > 0 ? unit.status.buffPower : 1;
}

/**
 * Mark unit death started (for animation tracking).
 * @param {Object} unit - UnitData object
 * @param {number} cleanupTime - Timestamp when cleanup is allowed
 */
export function startUnitDeath(unit, cleanupTime) {
  unit.deathStarted = true;
  unit.deathCleanupAt = cleanupTime;
  unit.dirty = true;
}

/**
 * Mark unit death animation complete.
 * @param {Object} unit - UnitData object
 */
export function completeUnitDeathAnim(unit) {
  unit.deathAnimDone = true;
}

/**
 * Clear dirty flags after render sync.
 * @param {Object} unit - UnitData object
 */
export function clearUnitDirtyFlags(unit) {
  unit.dirty = false;
  unit.positionDirty = false;
  unit.healthDirty = false;
  unit.statusDirty = false;
}
