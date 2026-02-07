/**
 * CombatSystem - Handles all combat logic.
 * Refactored to use GameContext instead of Scene.
 * Queries units from GameState, emits events for rendering.
 */

import { SIDE, WAVE_CONFIG, COMBAT_CONFIG } from "../config/GameConfig.js";
import { GameEvents } from "../core/EventBus.js";
import {
  isUnitAlive,
  damageUnit,
  healUnit,
  applyStatusToUnit,
  updateUnitTimers,
  moveUnit,
  getUnitDamageMult,
  startUnitDeath
} from "../entities/UnitData.js";
import { damageCastle, isCastleAlive } from "../entities/CastleData.js";
import {
  isTurretAlive,
  damageTurret,
  updateTurretTimers,
  canTurretAttack,
  turretAttack
} from "../entities/TurretData.js";

export default class CombatSystem {
  /**
   * @param {GameContext} ctx - The game context
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.state = ctx.state;
    this.events = ctx.events;
  }

  /**
   * Main update loop - processes all combat logic.
   * @param {number} delta - Delta time in seconds
   */
  update(delta) {
    if (this.state.isGameOver) return;

    const playerUnits = this.state.getAliveUnits(SIDE.PLAYER);
    const aiUnits = this.state.getAliveUnits(SIDE.AI);
    const playerTurrets = this.state.getAliveTurrets(SIDE.PLAYER);
    const aiTurrets = this.state.getAliveTurrets(SIDE.AI);
    const playerCastle = this.state.getCastle(SIDE.PLAYER);
    const aiCastle = this.state.getCastle(SIDE.AI);

    // Combine enemies for targeting
    const playerEnemies = [...aiUnits, ...aiTurrets];
    const aiEnemies = [...playerUnits, ...playerTurrets];

    // Update player units
    for (const unit of playerUnits) {
      this.updateUnit(unit, delta, playerEnemies, playerUnits, aiCastle);
    }

    // Update AI units
    for (const unit of aiUnits) {
      this.updateUnit(unit, delta, aiEnemies, aiUnits, playerCastle);
    }

    // Update turrets
    for (const turret of playerTurrets) {
      this.updateTurret(turret, delta, aiUnits);
    }
    for (const turret of aiTurrets) {
      this.updateTurret(turret, delta, playerUnits);
    }
  }

  /**
   * Update a single unit.
   */
  updateUnit(unit, delta, enemies, allies, enemyCastle) {
    if (!isUnitAlive(unit)) return;

    // Update timers
    updateUnitTimers(unit, delta);

    const isStunned = unit.status.stun > 0;
    let action = "idle";

    if (!isStunned) {
      if (unit.role === "support") {
        // Support units heal allies
        const ally = this.findHealTarget(unit, allies);
        if (ally && unit.attackCooldown === 0) {
          const buffMult = getUnitDamageMult(unit);
          const healed = healUnit(ally, unit.healAmount * buffMult);
          if (healed > 0) {
            this.events.emit(GameEvents.UNIT_HEALED, { unit: ally, amount: healed, healer: unit });
          }
          unit.attackCooldown = unit.attackRate;
          action = "attack";
        } else if (!ally) {
          moveUnit(unit, delta, enemyCastle.x);
          action = "run";
        }
      } else {
        // Combat units attack enemies
        const target = this.findTarget(unit, enemies);
        if (target) {
          if (unit.attackCooldown === 0) {
            this.performAttack(unit, target);
            action = "attack";
          }
        } else if (this.inCastleRange(unit, enemyCastle)) {
          if (unit.attackCooldown === 0) {
            this.attackCastle(unit, enemyCastle);
            action = "attack";
          }
        } else {
          moveUnit(unit, delta, enemyCastle.x);
          action = "run";
        }
      }
    }

    // Emit action for animation (renderer will handle)
    if (action !== "idle") {
      unit._lastAction = action;
    }
  }

  /**
   * Update a single turret.
   */
  updateTurret(turret, delta, enemies) {
    if (!isTurretAlive(turret)) return;

    updateTurretTimers(turret, delta);

    if (!canTurretAttack(turret)) return;

    const target = this.findTurretTarget(turret, enemies);
    if (target) {
      turretAttack(turret);

      const result = damageUnit(target, turret.dmg);
      this.events.emit(GameEvents.UNIT_DAMAGED, {
        unit: target,
        damage: result.damage,
        attacker: turret
      });

      if (result.isDead) {
        this.handleUnitDeath(target);
      }

      this.events.emit(GameEvents.TURRET_FIRED, {
        turret,
        targetX: target.x,
        targetY: target.y
      });
    }
  }

  /**
   * Perform an attack from one unit to another.
   */
  performAttack(attacker, target) {
    const buffMult = getUnitDamageMult(attacker);
    const damage = attacker.dmg * buffMult;

    // Check if target is a turret (has different damage function)
    if (target.entityType === "turret") {
      const result = damageTurret(target, damage, this.state.waveNumber);
      this.events.emit(GameEvents.UNIT_DAMAGED, {
        unit: target,
        damage: result.damage,
        attacker
      });
      if (result.isDestroyed) {
        this.events.emit(GameEvents.TURRET_DESTROYED, { turret: target });
        this.events.emit(GameEvents.LOG, { type: "turret", side: target.side });
      }
    } else {
      // Target is a unit
      const result = damageUnit(target, damage);
      this.events.emit(GameEvents.UNIT_DAMAGED, {
        unit: target,
        damage: result.damage,
        attacker
      });

      // Apply status effect if attacker has one
      if (attacker.config.statusOnHit && isUnitAlive(target)) {
        applyStatusToUnit(target, attacker.config.statusOnHit, attacker.side);
        this.events.emit(GameEvents.UNIT_STATUS_APPLIED, {
          unit: target,
          status: attacker.config.statusOnHit,
          attacker
        });
      }

      if (result.isDead) {
        this.handleUnitDeath(target);
      }
    }

    attacker.attackCooldown = attacker.attackRate;

    this.events.emit(GameEvents.ATTACK_PERFORMED, {
      attacker,
      target,
      damage
    });
  }

  /**
   * Attack the enemy castle.
   */
  attackCastle(attacker, castle) {
    const buffMult = getUnitDamageMult(attacker);
    const damage = attacker.dmg * buffMult;

    const result = damageCastle(castle, damage);

    this.events.emit(GameEvents.CASTLE_DAMAGED, {
      castle,
      damage: result.damage,
      attacker
    });

    attacker.attackCooldown = attacker.attackRate;

    if (result.isDestroyed) {
      this.events.emit(GameEvents.CASTLE_DESTROYED, { castle });
    }
  }

  /**
   * Handle unit death.
   */
  handleUnitDeath(unit) {
    const now = this.ctx.time.now;
    startUnitDeath(unit, now + 2000); // 2 second cleanup delay

    this.events.emit(GameEvents.UNIT_DIED, { unit });
    this.events.emit(GameEvents.LOG, { type: "death", side: unit.side, name: unit.config.name });
  }

  /**
   * Find target in range.
   */
  findTarget(attacker, enemies) {
    let closest = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      // Check if alive (works for both units and turrets)
      const alive = enemy.entityType === "turret"
        ? isTurretAlive(enemy)
        : isUnitAlive(enemy);
      if (!alive) continue;

      const dist = Math.abs(enemy.x - attacker.x);
      if (dist <= attacker.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }

  /**
   * Find turret target.
   */
  findTurretTarget(turret, enemies) {
    let closest = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (!isUnitAlive(enemy)) continue;

      const dist = Math.abs(enemy.x - turret.x);
      if (dist <= turret.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }

  /**
   * Find heal target for support units.
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
   * Check if unit is in castle attack range.
   */
  inCastleRange(unit, castle) {
    const dist = Math.abs(castle.x - unit.x);
    return dist <= COMBAT_CONFIG.castleAttackRange;
  }

  /**
   * Apply wave lock based on countdown.
   */
  applyWaveLock(countdown) {
    this.state.waveLocked = countdown <= WAVE_CONFIG.lockSeconds;
  }

  /**
   * Check for game over condition.
   */
  checkGameOver() {
    const playerCastle = this.state.getCastle(SIDE.PLAYER);
    const aiCastle = this.state.getCastle(SIDE.AI);

    if (!isCastleAlive(playerCastle) || !isCastleAlive(aiCastle)) {
      const winner = !isCastleAlive(playerCastle) ? "AI" : "Player";
      this.state.endGame(winner);
      this.events.emit(GameEvents.GAME_OVER, { winner });
    }
  }
}
