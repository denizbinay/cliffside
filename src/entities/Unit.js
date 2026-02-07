import { UNIT_ANIMATION_PROFILES } from "../data/unitAnimationProfiles.js";
import { SIDE, UNIT_SIZE, COMBAT_CONFIG } from "../config/GameConfig.js";

export default class Unit {
  constructor(scene, config, side, x, y, modifiers = {}) {
    this.scene = scene;
    this.config = config;
    this.side = side;
    this.role = config.role;

    const hpMult = modifiers.hpMult || 1;
    const dmgMult = modifiers.dmgMult || 1;
    const rangeMult = modifiers.rangeMult || 1;
    const speedMult = modifiers.speedMult || 1;
    const attackRateMult = modifiers.attackRateMult || 1;
    const healMult = modifiers.healMult || 1;

    this.maxHp = config.hp * hpMult;
    this.hp = this.maxHp;
    this.dmg = config.dmg * dmgMult;
    this.range = config.range * rangeMult;
    this.baseSpeed = config.speed * speedMult;
    this.attackRate = config.attackRate * attackRateMult;
    this.attackCooldown = 0;
    this.healAmount = (config.healAmount || 0) * healMult;

    this.status = {
      stun: 0,
      slow: 0,
      slowPower: 1,
      buff: 0,
      buffPower: 1
    };

    this.size = UNIT_SIZE[this.role] || UNIT_SIZE.default;
    this.body = scene.add.container(x, y);
    this.body.setDepth(4);
    this.baseColor = config.color;
    this.animatedProfile = this.resolveAnimatedProfile(config.id);
    this.currentUnitAnim = "";
    this.unitAnimLocked = false;
    this.actionAnimLockedUntil = 0;
    this.actionAnimLockedKey = "";
    this.deathStarted = false;
    this.deathAnimDone = false;
    this.deathCleanupAt = 0;

    if (this.animatedProfile) {
      const animatedSprite = scene.add.sprite(0, 0, this.animatedProfile.textureKey, 0);
      const sizeScale = this.animatedProfile.sizeScale || 2;
      const widthScale = this.animatedProfile.widthScale || 1;
      const heightScale = this.animatedProfile.heightScale || 1;
      animatedSprite.setDisplaySize(this.size * sizeScale * widthScale, this.size * sizeScale * heightScale);
      animatedSprite.setOrigin(this.animatedProfile.originX ?? 0.5, this.animatedProfile.originY ?? 0.7);
      animatedSprite.setFlipX(side === SIDE.AI);
      this.mainShape = animatedSprite;
      this.body.add(animatedSprite);
      this.playUnitAnim("idle", true);
    } else {
      const shapeData = this.buildShape(config.id, config.color);
      this.mainShape = shapeData.main;
      this.body.add([shapeData.main, ...shapeData.extras]);
    }

    this.statusDots = this.buildStatusDots();
    this.body.add(this.statusDots);

    this.healthBarOffsetY = Number.isFinite(this.animatedProfile?.healthBarOffsetY)
      ? this.animatedProfile.healthBarOffsetY
      : -30;
    this.healthBar = scene.add.rectangle(x, y + this.healthBarOffsetY, this.size, 5, 0x2d2f38);
    this.healthFill = scene.add.rectangle(x, y + this.healthBarOffsetY, this.size, 5, 0x76c27a);
    this.healthBar.setDepth(4);
    this.healthFill.setDepth(4);
  }

  isAlive() {
    return this.hp > 0;
  }

  update(delta, enemies, allies, enemyCastle) {
    if (!this.isAlive()) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.status.stun = Math.max(0, this.status.stun - delta);
    this.status.slow = Math.max(0, this.status.slow - delta);
    this.status.buff = Math.max(0, this.status.buff - delta);

    const isStunned = this.status.stun > 0;
    const speed = this.baseSpeed * (this.status.slow > 0 ? this.status.slowPower : 1);
    const buffMult = this.status.buff > 0 ? this.status.buffPower : 1;
    let action = "idle";

    if (!isStunned) {
      if (this.role === "support") {
        const ally = this.findHealTarget(allies);
        if (ally && this.attackCooldown === 0) {
          ally.heal(this.healAmount * buffMult);
          this.attackCooldown = this.attackRate;
          this.flash(0xc9f5c7);
          action = "attack";
        } else if (!ally) {
          this.move(speed, delta, enemyCastle.x);
          action = "run";
        }
      } else {
        const target = this.findTarget(enemies);
        if (target) {
          if (this.attackCooldown === 0) {
            target.takeDamage(this.dmg * buffMult);
            if (this.config.statusOnHit) {
              target.applyStatus(this.config.statusOnHit, this.side);
            }
            this.attackCooldown = this.attackRate;
            this.flash(0xffffff);
            action = "attack";
          }
        } else if (this.inCastleRange(enemyCastle.x)) {
          if (this.attackCooldown === 0) {
            enemyCastle.takeDamage(this.dmg * buffMult);
            this.attackCooldown = this.attackRate;
            this.flash(0xffe6a8);
            action = "attack";
          }
        } else {
          this.move(speed, delta, enemyCastle.x);
          action = "run";
        }
      }
    }

    this.playUnitAnim(action);
    this.syncBars();
  }

  move(speed, delta, enemyCastleX) {
    const dir = this.side === SIDE.PLAYER ? 1 : -1;
    this.body.x += dir * speed * delta;

    const stopX = enemyCastleX + (this.side === SIDE.PLAYER ? -40 : 40);
    if ((dir === 1 && this.body.x > stopX) || (dir === -1 && this.body.x < stopX)) {
      this.body.x = stopX;
    }
  }

  findTarget(enemies) {
    let closest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Math.abs(enemy.body.x - this.body.x);
      if (dist <= this.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  findHealTarget(allies) {
    let best = null;
    let missing = 0;
    for (const ally of allies) {
      if (!ally.isAlive()) continue;
      const dist = Math.abs(ally.body.x - this.body.x);
      const deltaHp = ally.maxHp - ally.hp;
      if (dist <= this.range && deltaHp > missing) {
        missing = deltaHp;
        best = ally;
      }
    }
    return best;
  }

  inCastleRange(castleX) {
    const dist = Math.abs(castleX - this.body.x);
    return dist <= COMBAT_CONFIG.castleAttackRange;
  }

  takeDamage(amount) {
    if (!this.isAlive()) return;

    this.hp = Math.max(0, this.hp - amount);
    this.flash(0xffc2c2);

    if (this.hp > 0) {
      this.playUnitAnim("hit", true);
      return;
    }

    this.healthBar.setVisible(false);
    this.healthFill.setVisible(false);

    if (this.deathStarted) return;
    this.deathStarted = true;

    const resolved = this.playUnitAnim("death", true);
    const deathAnim = resolved?.key ? this.scene.anims.get(resolved.key) : null;
    if (!deathAnim) {
      this.deathAnimDone = true;
      this.deathCleanupAt = this.scene.time.now;
      return;
    }

    const frameCount = deathAnim.frames?.length || 1;
    const frameRate = deathAnim.frameRate || 10;
    const durationMs = deathAnim.duration || Math.round((frameCount / frameRate) * 1000);
    this.deathCleanupAt = this.scene.time.now + Math.max(120, durationMs + 30);
    this.mainShape.once(`animationcomplete-${resolved.key}`, () => {
      this.deathAnimDone = true;
    });
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.flash(0xc9f5c7);
  }

  applyStatus(status, attackerSide) {
    if (status.type === "stun") {
      this.status.stun = Math.max(this.status.stun, status.duration);
      this.flash(0xb5c7ff);
    }
    if (status.type === "slow") {
      this.status.slow = Math.max(this.status.slow, status.duration);
      this.status.slowPower = status.power;
      this.flash(0x9fd6ff);
    }
    if (status.type === "pushback") {
      const dir = attackerSide === SIDE.PLAYER ? 1 : -1;
      this.body.x += dir * status.strength;
      this.status.stun = Math.max(this.status.stun, 0.3);
      this.flash(0xffe6a8);
    }
    if (status.type === "buff") {
      this.status.buff = Math.max(this.status.buff, status.duration);
      this.status.buffPower = status.power;
      this.flash(0xf1d08f);
    }
  }

  flash(color) {
    if (this.mainShape?.setFillStyle) {
      this.mainShape.setFillStyle(color);
    } else if (this.mainShape?.setTintFill) {
      this.mainShape.setTintFill(color);
    }
    this.scene.time.delayedCall(COMBAT_CONFIG.flashDuration, () => {
      if (!this.isAlive()) return;
      if (this.mainShape?.setFillStyle) {
        this.mainShape.setFillStyle(this.baseColor);
      } else if (this.mainShape?.clearTint) {
        this.mainShape.clearTint();
      }
    });
  }

  resolveAnimatedProfile(unitId) {
    const profile = UNIT_ANIMATION_PROFILES[unitId];
    if (!profile?.textureKey) return null;
    if (!this.scene.textures.exists(profile.textureKey)) return null;
    return profile;
  }

  resolveUnitAnimAction(action) {
    if (!this.animatedProfile?.actions) return null;

    const fallback = this.animatedProfile.fallback || {};
    const candidates = [action, ...(fallback[action] || []), "idle"];
    const visited = new Set();

    for (const candidate of candidates) {
      if (!candidate || visited.has(candidate)) continue;
      visited.add(candidate);
      const animDef = this.animatedProfile.actions[candidate];
      if (!animDef?.key) continue;
      if (this.scene.anims.exists(animDef.key)) {
        return { action: candidate, key: animDef.key, lock: animDef.lock === true };
      }
    }

    return null;
  }

  playUnitAnim(action, force = false) {
    if (!this.animatedProfile || !this.mainShape?.anims) return null;
    if (this.unitAnimLocked && !force && action !== "death") return null;
    if (!force && action !== "death" && this.scene.time.now < this.actionAnimLockedUntil) return null;

    const resolved = this.resolveUnitAnimAction(action);
    if (!resolved?.key) return null;

    if (!force && this.currentUnitAnim === resolved.key) return resolved;

    if (resolved.lock) this.unitAnimLocked = true;

    this.currentUnitAnim = resolved.key;
    this.mainShape.play(resolved.key, !force);
    this.lockTransientActionAnim(resolved);
    return resolved;
  }

  lockTransientActionAnim(resolved) {
    if (!resolved?.key) return;
    if (resolved.action !== "attack" && resolved.action !== "hit") return;

    const anim = this.scene.anims.get(resolved.key);
    if (!anim || (anim.repeat ?? 0) !== 0) return;

    const frameCount = anim.frames?.length || 1;
    const frameRate = anim.frameRate || 10;
    const durationMs = anim.duration || Math.round((frameCount / frameRate) * 1000);
    const minimumMs = resolved.action === "attack" ? 220 : 140;
    this.actionAnimLockedKey = resolved.key;
    this.actionAnimLockedUntil = this.scene.time.now + Math.max(minimumMs, durationMs);

    this.mainShape.once(`animationcomplete-${resolved.key}`, () => {
      if (this.actionAnimLockedKey === resolved.key) {
        this.actionAnimLockedUntil = 0;
        this.actionAnimLockedKey = "";
      }
    });
  }

  isReadyForCleanup() {
    if (this.isAlive()) return false;
    if (!this.deathStarted) return true;
    if (this.deathAnimDone) return true;
    return this.scene.time.now >= this.deathCleanupAt;
  }

  syncBars() {
    this.healthBar.x = this.body.x;
    this.healthFill.x = this.body.x;
    this.healthBar.y = this.body.y + this.healthBarOffsetY;
    this.healthFill.y = this.body.y + this.healthBarOffsetY;

    this.statusDots.x = 0;
    this.statusDots.y = -this.size * 0.85;
    this.updateStatusDots();

    const ratio = this.hp / this.maxHp;
    this.healthFill.width = this.healthBar.width * ratio;
    this.healthFill.x = this.healthBar.x - (this.healthBar.width - this.healthFill.width) / 2;
    this.healthFill.setVisible(ratio > 0.02);
  }

  destroy() {
    this.body.destroy();
    this.healthBar.destroy();
    this.healthFill.destroy();
  }

  buildShape(id, color) {
    const s = this.size;
    if (id === "guard") {
      const body = this.scene.add.rectangle(0, 0, s, s, color).setStrokeStyle(2, 0x1c1f27, 1);
      const shield = this.scene.add.rectangle(-s * 0.2, 0, s * 0.35, s * 0.6, 0xd6c8a7);
      return { main: body, extras: [shield] };
    }
    if (id === "archer") {
      const body = this.scene.add.rectangle(0, 0, s * 0.7, s * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
      const bow = this.scene.add.rectangle(s * 0.35, 0, s * 0.15, s * 0.9, 0xe7d9b8);
      return { main: body, extras: [bow] };
    }
    if (id === "cleric") {
      const body = this.scene.add.circle(0, 0, s * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
      const halo = this.scene.add.circle(0, -s * 0.55, s * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
      return { main: body, extras: [halo] };
    }
    if (id === "charger") {
      const body = this.scene.add.triangle(0, 0, -s * 0.6, s * 0.5, s * 0.6, s * 0.5, 0, -s * 0.6, color).setStrokeStyle(2, 0x1c1f27, 1);
      const horn = this.scene.add.rectangle(0, -s * 0.1, s * 0.6, s * 0.12, 0xf0d39a);
      return { main: body, extras: [horn] };
    }
    return { main: this.scene.add.rectangle(0, 0, s, s, color), extras: [] };
  }

  buildStatusDots() {
    const group = this.scene.add.container(0, 0);
    const stun = this.scene.add.circle(-12, 0, 4, 0x8cb7ff, 1);
    const slow = this.scene.add.circle(0, 0, 4, 0x9bd6ff, 1);
    const buff = this.scene.add.circle(12, 0, 4, 0xf1d08f, 1);
    group.add([stun, slow, buff]);
    group.setAlpha(0.9);
    group.setVisible(false);
    group.status = { stun, slow, buff };
    return group;
  }

  updateStatusDots() {
    const any = this.status.stun > 0 || this.status.slow > 0 || this.status.buff > 0;
    this.statusDots.setVisible(any);
    if (!any) return;
    this.statusDots.status.stun.setVisible(this.status.stun > 0);
    this.statusDots.status.slow.setVisible(this.status.slow > 0);
    this.statusDots.status.buff.setVisible(this.status.buff > 0);
  }

  /**
   * Build ghost shapes for the wave formation preview.
   * Shared static method to avoid duplicating shape definitions.
   */
  static buildGhostShapes(scene, typeId, unitTypes) {
    const config = unitTypes[typeId];
    if (!config) return [];
    const role = config.role;
    const size = UNIT_SIZE[role] || UNIT_SIZE.default;
    const color = config.color;
    const shapes = [];

    if (typeId === "guard") {
      const body = scene.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
      const shield = scene.add.rectangle(-size * 0.2, 0, size * 0.35, size * 0.6, 0xd6c8a7);
      shapes.push(body, shield);
      return shapes;
    }
    if (typeId === "archer") {
      const body = scene.add.rectangle(0, 0, size * 0.7, size * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
      const bow = scene.add.rectangle(size * 0.35, 0, size * 0.15, size * 0.9, 0xe7d9b8);
      shapes.push(body, bow);
      return shapes;
    }
    if (typeId === "cleric") {
      const body = scene.add.circle(0, 0, size * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
      const halo = scene.add.circle(0, -size * 0.55, size * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
      shapes.push(body, halo);
      return shapes;
    }
    if (typeId === "charger") {
      const body = scene.add.triangle(0, 0, -size * 0.6, size * 0.5, size * 0.6, size * 0.5, 0, -size * 0.6, color);
      body.setStrokeStyle(2, 0x1c1f27, 1);
      const horn = scene.add.rectangle(0, -size * 0.1, size * 0.6, size * 0.12, 0xf0d39a);
      shapes.push(body, horn);
      return shapes;
    }

    const body = scene.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
    shapes.push(body);
    return shapes;
  }
}
