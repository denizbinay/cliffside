/**
 * TurretData - Pure data representation of a turret.
 * No Phaser imports. All rendering is handled by TurretRenderer.
 */

import { TURRET_CONFIG } from "../config/GameConfig.js";

/**
 * Factory function to create a turret data object.
 * @param {Object} options - Turret configuration
 * @returns {Object} TurretData object
 */
export function createTurretData(options) {
  const {
    id = null,
    side,
    x,
    y,
    maxHp = TURRET_CONFIG.maxHp,
    range = TURRET_CONFIG.range,
    damage = TURRET_CONFIG.damage,
    attackRate = TURRET_CONFIG.attackRate,
    metrics = {}
  } = options;

  return {
    // Identity
    id,
    side,
    entityType: "turret",

    // Position
    x,
    y,

    // Stats
    maxHp,
    hp: maxHp,
    range,
    dmg: damage,
    attackRate,
    attackCooldown: 0,

    // Status effects
    status: {
      stun: 0
    },

    // Early wave protection
    earlyWaveShieldWaves: TURRET_CONFIG.earlyWaveShieldWaves,
    earlyWaveDamageMult: TURRET_CONFIG.earlyWaveDamageMult,
    earlyWaveMinHpRatio: TURRET_CONFIG.earlyWaveMinHpRatio,

    // Visual metrics (for renderer)
    metrics,

    // Dirty flags
    dirty: true,
    healthDirty: true
  };
}

/**
 * Check if turret is alive.
 * @param {Object} turret - TurretData object
 * @returns {boolean}
 */
export function isTurretAlive(turret) {
  return turret.hp > 0;
}

/**
 * Apply damage to a turret.
 * @param {Object} turret - TurretData object
 * @param {number} amount - Damage amount
 * @param {number} waveNumber - Current wave number (for early wave protection)
 * @returns {Object} Result with isDestroyed flag
 */
export function damageTurret(turret, amount, waveNumber = 0) {
  if (!isTurretAlive(turret)) return { isDestroyed: true, overkill: 0 };

  const prevHp = turret.hp;

  // Early wave protection
  if (waveNumber <= turret.earlyWaveShieldWaves) {
    const reduced = amount * turret.earlyWaveDamageMult;
    const minHp = turret.maxHp * turret.earlyWaveMinHpRatio;
    turret.hp = Math.max(minHp, turret.hp - reduced);
  } else {
    turret.hp = Math.max(0, turret.hp - amount);
  }

  turret.healthDirty = true;
  turret.dirty = true;

  const isDestroyed = turret.hp <= 0;
  const actualDamage = prevHp - turret.hp;
  const overkill = isDestroyed ? amount - prevHp : 0;

  return { isDestroyed, overkill, damage: actualDamage };
}

/**
 * Apply a status effect to a turret.
 * @param {Object} turret - TurretData object
 * @param {Object} status - Status effect { type, duration }
 */
export function applyStatusToTurret(turret, status) {
  if (!isTurretAlive(turret)) return;

  if (status.type === "stun") {
    turret.status.stun = Math.max(turret.status.stun, status.duration);
    turret.dirty = true;
  }
}

/**
 * Update turret timers (call each frame).
 * @param {Object} turret - TurretData object
 * @param {number} delta - Delta time in seconds
 */
export function updateTurretTimers(turret, delta) {
  if (!isTurretAlive(turret)) return;

  turret.attackCooldown = Math.max(0, turret.attackCooldown - delta);
  turret.status.stun = Math.max(0, turret.status.stun - delta);
}

/**
 * Check if turret can attack.
 * @param {Object} turret - TurretData object
 * @returns {boolean}
 */
export function canTurretAttack(turret) {
  if (!isTurretAlive(turret)) return false;
  if (turret.status.stun > 0) return false;
  if (turret.attackCooldown > 0) return false;
  return true;
}

/**
 * Trigger turret attack (sets cooldown).
 * @param {Object} turret - TurretData object
 */
export function turretAttack(turret) {
  turret.attackCooldown = turret.attackRate;
}

/**
 * Get HP ratio for UI display.
 * @param {Object} turret - TurretData object
 * @returns {number} HP ratio between 0 and 1
 */
export function getTurretHpRatio(turret) {
  return Math.max(0, Math.min(1, turret.hp / turret.maxHp));
}

/**
 * Clear dirty flags after render sync.
 * @param {Object} turret - TurretData object
 */
export function clearTurretDirtyFlags(turret) {
  turret.dirty = false;
  turret.healthDirty = false;
}
