import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units.js";
import { UNIT_ANIMATION_PROFILES } from "../data/unitAnimationProfiles.js";
import { ABILITIES } from "../data/abilities.js";
import { SHOP_CONFIG } from "../data/shop.js";
import { STANCES } from "../data/stances.js";

const SIDE = {
  PLAYER: "player",
  AI: "ai"
};

const CASTLE_VARIANTS = [
  {
    id: "v1",
    label: "Twin V1",
    baseKey: "castle_twin_base_v1",
    towerKey: "castle_twin_tower_v1"
  },
  {
    id: "v2",
    label: "Twin V2",
    baseKey: "castle_twin_base_v2",
    towerKey: "castle_twin_tower_v2"
  },
  {
    id: "v3",
    label: "Twin V3",
    baseKey: "castle_twin_base_v3",
    towerKey: "castle_twin_tower_v3"
  }
];

const CASTLE_METRICS = {
  baseWidth: 132,
  baseHeight: 176,
  baseCenterYOffset: 28,
  baseFootInset: 10,
  towerWidth: 88,
  towerHeight: 60,
  towerOffsetY: -56,
  bannerOffsetX: 20,
  bannerOffsetY: -76,
  hpOffsetX: 0,
  hpOffsetY: -118,
  hpWidth: 220,
  hpHeight: 20
};

const LAYOUT_STORAGE_KEY = "layoutProfileV4";

function createDefaultLayoutProfile(playArea) {
  return {
    mirrorMode: true,
    castle: {
      playerX: 66.11289364230541,
      aiX: 1213.8871063576946,
      anchorY: 291.6164943553179,
      baseWidth: CASTLE_METRICS.baseWidth,
      baseHeight: CASTLE_METRICS.baseHeight,
      baseCenterYOffset: CASTLE_METRICS.baseCenterYOffset,
      towerWidth: CASTLE_METRICS.towerWidth,
      towerHeight: CASTLE_METRICS.towerHeight,
      towerOffsetY: CASTLE_METRICS.towerOffsetY,
      bannerOffsetX: CASTLE_METRICS.bannerOffsetX,
      bannerOffsetY: CASTLE_METRICS.bannerOffsetY,
      hpOffsetX: CASTLE_METRICS.hpOffsetX,
      hpOffsetY: CASTLE_METRICS.hpOffsetY,
      hpWidth: CASTLE_METRICS.hpWidth,
      hpHeight: CASTLE_METRICS.hpHeight
    },
    decks: {
      foundation: {
        leftStart: -0.9007724301842046,
        leftEnd: 140.1152703505645,
        rightStart: 1139.8847296494355,
        rightEnd: 1280.9007724301841,
        topY: 397.3348544266191,
        height: 84
      },
      spawn: {
        leftStart: 69.13131313131312,
        leftEnd: 213.0469399881164,
        rightStart: 1066.9530600118835,
        rightEnd: 1210.8686868686868,
        topY: 418.60045157456915,
        height: 60
      }
    },
    bridge: {
      topY: 411.755531788473,
      plankOffsetY: 24,
      thickness: 14,
      showPillars: false,
      showRopes: false,
      showControlFx: false,
      ropeTopOffset: 0,
      ropeBottomOffset: 48,
      pillarOffsetY: 23,
      pillarHeight: 42,
      pillarStep: 90
    },
    turret: {
      sideInset: 26.366013071895452,
      yOffset: 9.61913250148541,
      showBase: false,
      baseWidth: 88.28363730688557,
      baseHeight: 68.21917428259343,
      headWidth: 56.180496468018134,
      headHeight: 56.180496468018134,
      hpOffsetX: 0,
      hpOffsetY: -36,
      hpWidth: 44,
      hpHeight: 5
    },
    units: {
      spawnInset: 80.30897207367796,
      laneY: 410.9949851455734,
      calloutOffsetY: -40
    },
    control: {
      y: 395.3895187165776,
      zoneWidth: 120,
      zoneHeight: 52
    }
  };
}

class Unit {
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

    this.size = this.role === "frontline" ? 40 : this.role === "damage" ? 32 : 34;
    this.body = scene.add.container(x, y);
    this.body.setDepth(4);
    this.baseColor = config.color;
    this.animatedProfile = this.resolveAnimatedProfile(config.id);
    this.currentUnitAnim = "";
    this.unitAnimLocked = false;
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
    return dist <= 50;
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
    this.scene.time.delayedCall(100, () => {
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

    const resolved = this.resolveUnitAnimAction(action);
    if (!resolved?.key) return null;

    if (!force && this.currentUnitAnim === resolved.key) return resolved;

    if (resolved.lock) this.unitAnimLocked = true;

    this.currentUnitAnim = resolved.key;
    this.mainShape.play(resolved.key, !force);
    return resolved;
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

  buildRoleBadge(role) {
    const label = role === "frontline" ? "F" : role === "damage" ? "D" : role === "support" ? "S" : "X";
    const badge = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(0, 0, 18, 16, 0x1b1e27).setStrokeStyle(1, 0xe2d2b3, 1);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: "Cinzel",
      fontSize: "12px",
      color: "#e7e2d8"
    });
    text.setOrigin(0.5, 0.5);
    badge.add([bg, text]);
    return badge;
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
}

class Turret {
  constructor(scene, side, x, y, metrics = {}) {
    this.scene = scene;
    this.side = side;
    this.x = x;
    this.y = y;
    this.maxHp = 520;
    this.hp = 520;
    this.range = 190;
    this.dmg = 22;
    this.attackRate = 0.72;
    this.attackCooldown = 0;
    this.status = { stun: 0 };
    this.earlyWaveShieldWaves = 2;
    this.earlyWaveDamageMult = 0.35;
    this.earlyWaveMinHpRatio = 0.35;
    this.base = null;
    this.baseIsSprite = false;

    this.body = scene.add.container(x, y);
    this.body.setDepth(3);
    const hasTurretBase = scene.textures.exists("turret_base");
    const turretHeadKey = scene.textures.exists("turret_head_keyed")
      ? "turret_head_keyed"
      : scene.textures.exists("turret_head")
      ? "turret_head"
      : null;
    const hasTurretHead = Boolean(turretHeadKey);
    const showBase = metrics.showBase === true;
    const baseWidth = metrics.baseWidth || 44;
    const baseHeight = metrics.baseHeight || 34;
    const headWidth = metrics.headWidth || 28;
    const headHeight = metrics.headHeight || 28;

    if (showBase && hasTurretBase) {
      const base = scene.add.image(0, 0, "turret_base").setDisplaySize(baseWidth, baseHeight);
      const teamTint = side === SIDE.PLAYER ? 0xb5cee6 : 0xe1bbbb;
      base.setTint(teamTint);
      this.body.add(base);
      this.base = base;
      this.baseIsSprite = true;
      this.baseTeamTint = teamTint;
    } else if (showBase) {
      const base = scene
        .add.rectangle(0, 0, 36, 26, side === SIDE.PLAYER ? 0x5a6b7a : 0x7a5a5a)
        .setStrokeStyle(2, 0x1c1f27, 1);
      const tower = scene.add.rectangle(0, -16, 24, 22, 0x2b303b).setStrokeStyle(2, 0x1c1f27, 1);
      this.body.add([base, tower]);
      this.base = base;
      this.baseIsSprite = false;
    }

    const headY = showBase ? -24 : -headHeight * 0.5;
    if (hasTurretHead) {
      const head = scene.add.image(0, headY, turretHeadKey).setDisplaySize(headWidth, headHeight);
      head.setFlipX(side === SIDE.AI);
      this.body.add(head);
    } else {
      const head = scene
        .add.triangle(0, headY - 6, -8, 6, 8, 6, 0, -6, 0xe2d2b3)
        .setStrokeStyle(1, 0x1c1f27, 1);
      this.body.add(head);
    }

    const healthBarWidth = metrics.hpWidth || 44;
    const healthBarHeight = metrics.hpHeight || 5;
    const turretTopY = Math.min(showBase ? -baseHeight * 0.5 : Number.POSITIVE_INFINITY, headY - headHeight * 0.5);
    this.healthBarOffsetX = metrics.hpOffsetX || 0;
    this.healthBarOffsetY = Number.isFinite(metrics.hpOffsetY) ? metrics.hpOffsetY : turretTopY - healthBarHeight * 1.4;

    this.healthBar = scene.add.rectangle(x + this.healthBarOffsetX, y + this.healthBarOffsetY, healthBarWidth, healthBarHeight, 0x2d2f38);
    this.healthFill = scene.add.rectangle(
      x + this.healthBarOffsetX,
      y + this.healthBarOffsetY,
      healthBarWidth,
      Math.max(2, healthBarHeight - 1),
      0x9ec9f0
    );
    this.healthBar.setDepth(4);
    this.healthFill.setDepth(4);
  }

  isAlive() {
    return this.hp > 0;
  }

  update(delta, enemies) {
    if (!this.isAlive()) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.status.stun = Math.max(0, this.status.stun - delta);
    if (this.status.stun > 0) return;

    const target = this.findTarget(enemies);
    if (target && this.attackCooldown === 0) {
      this.attackCooldown = this.attackRate;
      target.takeDamage(this.dmg);
      this.fireArrow(target.body.x, target.body.y);
      this.flash(0xffe6a8);
    }
  }

  findTarget(enemies) {
    let closest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Math.abs(enemy.body.x - this.x);
      if (dist <= this.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  fireArrow(tx, ty) {
    const arrow = this.scene.add.rectangle(this.x, this.y - 22, 12, 2, 0xf3ead7);
    arrow.setRotation(Math.atan2(ty - this.y, tx - this.x));
    this.scene.tweens.add({
      targets: arrow,
      x: tx,
      y: ty,
      alpha: 0.2,
      duration: 260,
      onComplete: () => arrow.destroy()
    });
  }

  takeDamage(amount) {
    const waveNumber = this.scene.waveNumber || 0;
    if (waveNumber <= this.earlyWaveShieldWaves) {
      const reduced = amount * this.earlyWaveDamageMult;
      const minHp = this.maxHp * this.earlyWaveMinHpRatio;
      this.hp = Math.max(minHp, this.hp - reduced);
    } else {
      this.hp = Math.max(0, this.hp - amount);
    }
    this.flash(0xffc2c2);
    if (!this.isAlive()) {
      this.scene.events.emit("log", { type: "turret", side: this.side });
      this.destroy();
    }
  }

  applyStatus(status) {
    if (status.type === "stun") {
      this.status.stun = Math.max(this.status.stun, status.duration);
    }
  }

  flash(color) {
    if (!this.base) return;
    if (this.baseIsSprite) {
      this.base.setTintFill(color);
    } else {
      this.base.setFillStyle(color);
    }
    this.scene.time.delayedCall(100, () => {
      if (!this.isAlive()) return;
      if (this.baseIsSprite) {
        this.base.setTint(this.baseTeamTint);
      } else {
        this.base.setFillStyle(this.side === SIDE.PLAYER ? 0x5a6b7a : 0x7a5a5a);
      }
    });
  }

  syncBars() {
    this.healthBar.x = this.x + this.healthBarOffsetX;
    this.healthFill.x = this.x + this.healthBarOffsetX;
    this.healthBar.y = this.y + this.healthBarOffsetY;
    this.healthFill.y = this.y + this.healthBarOffsetY;
    const ratio = this.hp / this.maxHp;
    this.healthFill.width = this.healthBar.width * ratio;
    this.healthFill.x = this.healthBar.x - (this.healthBar.width - this.healthFill.width) / 2;
  }

  destroy() {
    this.body.destroy();
    this.healthBar.destroy();
    this.healthFill.destroy();
  }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.castleVariants = CASTLE_VARIANTS;
    this.castleVariantIndex = 2;

    this.width = this.scale.width;
    this.height = this.scale.height;
    this.uiLeft = 0;
    this.uiTop = 84;
    this.uiBottom = 200;
    this.playArea = {
      x: this.uiLeft,
      y: this.uiTop,
      width: this.width - this.uiLeft,
      height: this.height - this.uiTop - this.uiBottom
    };

    this.layoutProfile = createDefaultLayoutProfile(this.playArea);
    this.loadLayoutProfile();
    this.computeBoardLayout();

    this.bridgeVisuals = [];
    this.createBackground();
    this.createBridge();
    this.createCastles();
    this.createTurrets();

    this.playerUnits = [];
    this.aiUnits = [];
    this.playerTurrets = [this.playerTurret];
    this.aiTurrets = [this.aiTurret];

    this.registerLayoutDevHotkeys();
    this.createLayoutDevPanel();
    this.registerUnitDevHotkeys();
    this.createUnitDevPanel();
    this.events.once("shutdown", () => {
      this.destroyLayoutDevPanel();
      this.destroyUnitDevPanel();
    });

    this.isGameOver = false;
    this.lastCastleHitLog = { player: 0, ai: 0 };

    this.zoneOwner = "neutral";
    this.zoneCheckTimer = 0;

    this.baseIncome = 1.1;
    this.zoneBonus = 1.2;
    this.pointBonus = 0.35;
    this.enemyPointBonus = 0.25;
    this.killBonus = 0.6;

    this.interestRate = 0.05;
    this.interestCap = 12;
    this.interestTick = 1;

    this.playerResources = 20;
    this.aiResources = 20;

    this.abilityCooldowns = {
      healWave: 0,
      pulse: 0
    };

    this.matchTime = 0;
    this.waveLockSeconds = 5;
    this.waveSupply = 12;
    this.waveSize = this.waveSupply;
    this.waveSlots = { front: 4, mid: 4, rear: 4 };
    this.waveStagger = 0.2;
    this.waveSchedule = [
      { time: 0, interval: 45 },
      { time: 180, interval: 35 },
      { time: 420, interval: 25 }
    ];
    this.waveCountdown = this.getWaveInterval(this.matchTime);
    this.waveLocked = false;
    this.waveNumber = 0;

    this.playerDraft = this.createWaveDraft();
    this.aiDraft = this.createWaveDraft();

    this.shop = {
      player: { offers: [], rerolls: 0 },
      ai: { offers: [], rerolls: 0 }
    };
    this.rollShopOffers(SIDE.PLAYER, true);
    this.rollShopOffers(SIDE.AI, true);

    this.waveStance = { player: "normal", ai: "normal" };

    this.ghostAlpha = 0.35;
    this.createGhostFormation();

    this.resourceAccumulator = 0;
    this.emitResourceUpdate();

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => this.aiDecision()
    });

    this.events.on("spawn-request", (type) => this.requestSpawn(type));
    this.events.on("queue-add", (payload) => this.queueUnit(payload, SIDE.PLAYER));
    this.events.on("queue-remove", (payload) => this.removeQueuedUnit(payload, SIDE.PLAYER));
    this.events.on("queue-move", (payload) => this.moveQueuedUnit(payload, SIDE.PLAYER));
    this.events.on("shop-reroll", () => this.requestShopReroll(SIDE.PLAYER));
    this.events.on("stance-select", (payload) => this.selectStance(payload, SIDE.PLAYER));
    this.events.on("ability-request", (id) => this.requestAbility(id));

    this.emitUiState();
  }

  resolveInitialCastleVariantIndex() {
    const max = CASTLE_VARIANTS.length;
    if (typeof window !== "undefined") {
      try {
        const query = new URLSearchParams(window.location.search).get("castleVariant");
        const numeric = Number(query);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= max) {
          return numeric - 1;
        }
      } catch {
        // ignore invalid query
      }

      try {
        const stored = Number(window.localStorage.getItem("castleVariantIndex"));
        if (!Number.isNaN(stored) && stored >= 0 && stored < max) {
          return stored;
        }
      } catch {
        // ignore storage issues
      }
    }
    return 0;
  }

  getCastleVariant() {
    const variant = this.castleVariants[this.castleVariantIndex] || this.castleVariants[0];
    const hasVariantBase = variant && this.textures.exists(variant.baseKey);
    const hasVariantTower = variant && this.textures.exists(variant.towerKey);
    return {
      label: hasVariantBase ? variant.label : "Legacy",
      baseKey: hasVariantBase ? variant.baseKey : "castle_base_player",
      towerKey: hasVariantTower ? variant.towerKey : "castle_tower",
      useTwinMirror: hasVariantBase
    };
  }

  createCastleVariantIndicator() {
    const variant = this.getCastleVariant();
    this.castleVariantText = this.add
      .text(this.width / 2, this.uiTop + 6, `Castle: ${variant.label}  [ / ]`, {
        fontFamily: "Alegreya Sans",
        fontSize: "12px",
        color: "#d9d1bf"
      })
      .setOrigin(0.5, 0)
      .setDepth(30)
      .setAlpha(0.85);
  }

  registerCastleVariantHotkeys() {
    if (!this.input?.keyboard) return;
    this.input.keyboard.on("keydown-OPEN_BRACKET", () => this.cycleCastleVariant(-1));
    this.input.keyboard.on("keydown-CLOSE_BRACKET", () => this.cycleCastleVariant(1));
  }

  cycleCastleVariant(delta) {
    if (!this.castleVariants || this.castleVariants.length === 0) return;
    const len = this.castleVariants.length;
    this.castleVariantIndex = (this.castleVariantIndex + delta + len) % len;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("castleVariantIndex", `${this.castleVariantIndex}`);
      } catch {
        // ignore storage issues
      }
    }
    this.scene.restart();
  }

  registerUnitDevHotkeys() {
    if (!this.input?.keyboard) return;
    const units = Object.values(UNIT_TYPES)
      .sort((a, b) => (a.tier || 0) - (b.tier || 0) || (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name))
      .map((unit) => unit.id);
    this.unitDev = {
      enabled: false,
      selectedUnitId: units.includes("breaker") ? "breaker" : units[0] || null,
      selectedSide: SIDE.PLAYER,
      spawnCount: 1,
      unitIds: units
    };
    this.unitDevToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.unitDevKeys = {
      enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      p: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      o: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O)
    };
  }

  isTypingInInput() {
    if (typeof document === "undefined") return false;
    const active = document.activeElement;
    if (!active) return false;
    const tag = (active.tagName || "").toLowerCase();
    return tag === "input" || tag === "select" || tag === "textarea";
  }

  handleUnitDevInput() {
    if (!this.unitDev) return;
    if (this.unitDevToggleKey && Phaser.Input.Keyboard.JustDown(this.unitDevToggleKey)) {
      this.toggleUnitDev();
    }
    if (!this.unitDev.enabled || !this.input?.keyboard || this.isTypingInInput()) return;

    if (this.unitDevKeys.left && Phaser.Input.Keyboard.JustDown(this.unitDevKeys.left)) {
      this.cycleUnitDevSelection(-1);
    }
    if (this.unitDevKeys.right && Phaser.Input.Keyboard.JustDown(this.unitDevKeys.right)) {
      this.cycleUnitDevSelection(1);
    }
    if (this.unitDevKeys.p && Phaser.Input.Keyboard.JustDown(this.unitDevKeys.p)) {
      this.unitDev.selectedSide = SIDE.PLAYER;
      this.syncUnitDevPanel();
    }
    if (this.unitDevKeys.o && Phaser.Input.Keyboard.JustDown(this.unitDevKeys.o)) {
      this.unitDev.selectedSide = SIDE.AI;
      this.syncUnitDevPanel();
    }
    if (this.unitDevKeys.enter && Phaser.Input.Keyboard.JustDown(this.unitDevKeys.enter)) {
      this.handleUnitDevSpawn();
    }
  }

  toggleUnitDev() {
    if (!this.unitDev) return;
    this.unitDev.enabled = !this.unitDev.enabled;
    this.syncUnitDevPanel();
  }

  cycleUnitDevSelection(step) {
    if (!this.unitDev?.unitIds?.length) return;
    const list = this.unitDev.unitIds;
    const current = Math.max(0, list.indexOf(this.unitDev.selectedUnitId));
    const next = (current + step + list.length) % list.length;
    this.unitDev.selectedUnitId = list[next];
    this.syncUnitDevPanel();
  }

  handleUnitDevSpawn(side = this.unitDev?.selectedSide) {
    if (!this.unitDev?.selectedUnitId) return;
    this.spawnDevUnits(this.unitDev.selectedUnitId, side || SIDE.PLAYER, this.unitDev.spawnCount || 1);
  }

  createUnitDevPanel() {
    if (typeof document === "undefined") return;
    const panel = document.createElement("div");
    panel.id = "unit-dev-panel";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.top = "336px";
    panel.style.width = "300px";
    panel.style.padding = "10px";
    panel.style.background = "rgba(13, 17, 24, 0.9)";
    panel.style.border = "1px solid rgba(177, 198, 240, 0.35)";
    panel.style.borderRadius = "8px";
    panel.style.color = "#e8edf7";
    panel.style.font = "12px/1.4 monospace";
    panel.style.zIndex = "9999";
    panel.style.display = "none";

    panel.innerHTML = `
      <div style="margin-bottom:6px; font-weight:700;">Unit Dev Spawn</div>
      <div style="margin-bottom:8px; opacity:0.85;">Toggle: U. Enter spawn. <-/-> cycle unit. P player, O enemy.</div>
      <div style="display:grid; gap:8px; margin-bottom:8px;">
        <label style="display:grid; gap:4px;">
          <span>Unit</span>
          <select data-unitdev-unit style="padding:4px;"></select>
        </label>
        <label style="display:grid; gap:4px;">
          <span>Side</span>
          <select data-unitdev-side style="padding:4px;">
            <option value="player">Player</option>
            <option value="ai">AI</option>
          </select>
        </label>
        <label style="display:grid; gap:4px;">
          <span>Count</span>
          <input data-unitdev-count type="number" min="1" max="24" step="1" value="1" style="padding:4px;" />
        </label>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
        <button data-unitdev-spawn type="button">Spawn</button>
        <button data-unitdev-spawn-player type="button">Spawn Player</button>
        <button data-unitdev-spawn-ai type="button">Spawn AI</button>
      </div>
      <div data-unitdev-info style="min-height:18px; opacity:0.9;"></div>
    `;
    document.body.appendChild(panel);

    const unitSelect = panel.querySelector("[data-unitdev-unit]");
    const sideSelect = panel.querySelector("[data-unitdev-side]");
    const countInput = panel.querySelector("[data-unitdev-count]");
    const spawnBtn = panel.querySelector("[data-unitdev-spawn]");
    const spawnPlayerBtn = panel.querySelector("[data-unitdev-spawn-player]");
    const spawnAiBtn = panel.querySelector("[data-unitdev-spawn-ai]");

    const unitIds = this.unitDev?.unitIds || [];
    unitIds.forEach((id) => {
      const unit = UNIT_TYPES[id];
      if (!unit || !unitSelect) return;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${unit.name} (${id})`;
      unitSelect.appendChild(option);
    });

    unitSelect?.addEventListener("change", (event) => {
      this.unitDev.selectedUnitId = event.target?.value || this.unitDev.selectedUnitId;
      this.syncUnitDevPanel();
    });
    sideSelect?.addEventListener("change", (event) => {
      const value = event.target?.value;
      this.unitDev.selectedSide = value === SIDE.AI ? SIDE.AI : SIDE.PLAYER;
      this.syncUnitDevPanel();
    });
    countInput?.addEventListener("change", (event) => {
      this.unitDev.spawnCount = Phaser.Math.Clamp(Number(event.target?.value) || 1, 1, 24);
      this.syncUnitDevPanel();
    });
    spawnBtn?.addEventListener("click", () => this.handleUnitDevSpawn());
    spawnPlayerBtn?.addEventListener("click", () => this.handleUnitDevSpawn(SIDE.PLAYER));
    spawnAiBtn?.addEventListener("click", () => this.handleUnitDevSpawn(SIDE.AI));

    this.unitDevPanel = panel;
    this.syncUnitDevPanel();
  }

  destroyUnitDevPanel() {
    if (this.unitDevPanel?.parentElement) {
      this.unitDevPanel.parentElement.removeChild(this.unitDevPanel);
    }
    this.unitDevPanel = null;
  }

  syncUnitDevPanel() {
    if (!this.unitDevPanel || !this.unitDev) return;
    this.unitDevPanel.style.display = this.unitDev.enabled ? "block" : "none";

    const unitSelect = this.unitDevPanel.querySelector("[data-unitdev-unit]");
    const sideSelect = this.unitDevPanel.querySelector("[data-unitdev-side]");
    const countInput = this.unitDevPanel.querySelector("[data-unitdev-count]");
    const info = this.unitDevPanel.querySelector("[data-unitdev-info]");

    if (unitSelect) unitSelect.value = this.unitDev.selectedUnitId || "";
    if (sideSelect) sideSelect.value = this.unitDev.selectedSide || SIDE.PLAYER;
    if (countInput) countInput.value = `${this.unitDev.spawnCount || 1}`;
    if (info) {
      const unitName = UNIT_TYPES[this.unitDev.selectedUnitId]?.name || this.unitDev.selectedUnitId || "none";
      info.textContent = `Spawning ${this.unitDev.spawnCount}x ${unitName} for ${this.unitDev.selectedSide}`;
    }
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;

    this.handleLayoutDevInput();
    this.handleUnitDevInput();
    if (this.layoutDev?.enabled) {
      this.emitUiState();
      return;
    }

    if (this.isGameOver) return;

    this.matchTime += delta;

    this.resourceAccumulator += delta;
    while (this.resourceAccumulator >= this.interestTick) {
      this.resourceAccumulator -= this.interestTick;
      this.gainResources();
    }

    this.abilityCooldowns.healWave = Math.max(0, this.abilityCooldowns.healWave - delta);
    this.abilityCooldowns.pulse = Math.max(0, this.abilityCooldowns.pulse - delta);

    this.waveCountdown -= delta;
    while (this.waveCountdown <= 0) {
      this.waveNumber += 1;
      this.sendWave(SIDE.PLAYER);
      this.sendWave(SIDE.AI);
      this.rollShopOffers(SIDE.PLAYER, true);
      this.rollShopOffers(SIDE.AI, true);
      this.waveCountdown += this.getWaveInterval(this.matchTime);
    }
    this.waveLocked = false;

    const playerUnitEnemies = [...this.aiUnits, ...this.aiTurrets.filter((t) => t && t.isAlive())];
    const aiUnitEnemies = [...this.playerUnits, ...this.playerTurrets.filter((t) => t && t.isAlive())];

    for (const unit of this.playerUnits) {
      unit.update(delta, playerUnitEnemies, this.playerUnits, this.aiCastle);
    }
    for (const unit of this.aiUnits) {
      unit.update(delta, aiUnitEnemies, this.aiUnits, this.playerCastle);
    }

    for (const turret of this.playerTurrets) {
      if (!turret) continue;
      turret.update(delta, this.aiUnits);
      if (turret.isAlive()) turret.syncBars();
    }
    for (const turret of this.aiTurrets) {
      if (!turret) continue;
      turret.update(delta, this.playerUnits);
      if (turret.isAlive()) turret.syncBars();
    }

    this.cleanupUnits();

    this.updateGhostFormation();

    this.zoneCheckTimer += delta;
    if (this.zoneCheckTimer >= 0.3) {
      this.zoneCheckTimer = 0;
      this.updateControlPoints();
    }

    this.checkGameOver();

    this.updateCastleHud();

    this.emitUiState();
  }

  createBackground() {
    const hasBgSky = this.textures.exists("bg_sky");

    this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x151922).setDepth(-20);

    const sky = hasBgSky
      ? this.add.image(this.width / 2, this.height / 2, "bg_sky")
      : this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x273145);
    if (hasBgSky) {
      const frame = this.textures.get("bg_sky").getSourceImage();
      const scale = Math.max((this.width + 8) / frame.width, (this.height + 8) / frame.height);
      sky.setScale(scale);
    }
    sky.setDepth(-18);

    const vignette = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x0d1016, 0.15).setDepth(4);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  createBridge() {
    this.clearBridgeVisuals();
    const bridgeY = this.controlY;
    const bridgeThickness = this.bridgeThickness;
    const bridgePlankY = this.bridgePlankY;
    const ropeTopY = this.bridgeRopeTopY;
    const ropeBottomY = this.bridgeRopeBottomY;

    this.platformLeftStart = this.boardLayout.leftSpawnStart;
    this.platformLeftEnd = this.boardLayout.leftSpawnEnd;
    this.platformRightStart = this.boardLayout.rightSpawnStart;
    this.platformRightEnd = this.boardLayout.rightSpawnEnd;
    this.bridgeLeft = this.boardLayout.bridgeLeft;
    this.bridgeRight = this.boardLayout.bridgeRight;
    const bridgeWidth = this.bridgeRight - this.bridgeLeft;
    const bridgeCenter = this.playArea.x + this.playArea.width / 2;

    const hasPlatform = this.textures.exists("platform_stone");
    const hasBridgePlank = this.textures.exists("bridge_plank");
    const hasBridgePillar = this.textures.exists("bridge_pillar");
    const hasBridgeRope = this.textures.exists("bridge_rope");

    this.drawDeckSegment(this.boardLayout.leftFoundationStart, this.boardLayout.leftFoundationEnd, this.foundationDeckY, this.foundationDeckHeight, 1, hasPlatform);
    this.drawDeckSegment(this.boardLayout.rightFoundationStart, this.boardLayout.rightFoundationEnd, this.foundationDeckY, this.foundationDeckHeight, 1, hasPlatform);
    this.drawDeckSegment(this.platformLeftStart, this.platformLeftEnd, this.spawnDeckY, this.spawnDeckHeight, 2, hasPlatform);
    this.drawDeckSegment(this.platformRightStart, this.platformRightEnd, this.spawnDeckY, this.spawnDeckHeight, 2, hasPlatform);

    if (hasBridgePlank) {
      const segmentCount = 6;
      const segmentWidth = bridgeWidth / segmentCount;
      for (let i = 0; i < segmentCount; i += 1) {
        const x = this.bridgeLeft + segmentWidth * (i + 0.5);
        this.addBridgeVisual(this.add.image(x, bridgePlankY, "bridge_plank").setDisplaySize(segmentWidth + 2, bridgeThickness).setDepth(2));
      }
    } else {
      this.addBridgeVisual(this.add.rectangle(bridgeCenter, bridgePlankY, bridgeWidth, bridgeThickness - 6, 0x3c312c).setStrokeStyle(2, 0x241b18, 1).setDepth(2));
      this.addBridgeVisual(this.add.rectangle(bridgeCenter, bridgePlankY - bridgeThickness * 0.4, bridgeWidth - 16, 6, 0x2a211e).setDepth(2));
      this.addBridgeVisual(this.add.rectangle(bridgeCenter, bridgePlankY + bridgeThickness * 0.4, bridgeWidth - 16, 6, 0x2a211e).setDepth(2));
    }

    if (this.bridgeShowPillars) {
      for (let x = this.bridgeLeft + 20; x <= this.bridgeRight - 20; x += this.bridgePillarStep) {
        if (hasBridgePillar) {
          this.addBridgeVisual(this.add.image(x, this.bridgePillarY, "bridge_pillar").setDisplaySize(18, this.bridgePillarHeight).setDepth(2));
        } else {
          this.addBridgeVisual(this.add.rectangle(x, this.bridgePillarY, 10, this.bridgePillarHeight - 4, 0x2d2522).setDepth(2));
        }
      }
    }

    if (this.bridgeShowRopes) {
      if (hasBridgeRope) {
        this.addBridgeVisual(this.add.tileSprite(bridgeCenter, ropeTopY, bridgeWidth, 12, "bridge_rope").setDepth(3).setAlpha(0.9));
        this.addBridgeVisual(this.add.tileSprite(bridgeCenter, ropeBottomY, bridgeWidth, 12, "bridge_rope").setDepth(3).setAlpha(0.9));
      } else {
        const rope = this.addBridgeVisual(this.add.graphics().setDepth(3));
        rope.lineStyle(3, 0x1b1f27, 0.9);
        this.drawRope(rope, this.bridgeLeft, this.bridgeRight, ropeTopY - 2, 10);
        this.drawRope(rope, this.bridgeLeft, this.bridgeRight, ropeBottomY + 2, 10);
      }
    }

    this.controlPoints = [];
    const hasControlRune = this.textures.exists("control_rune");
    const hasControlGlow = this.textures.exists("control_glow");
    const pointCount = 5;
    const spacing = bridgeWidth / (pointCount + 1);
    for (let i = 0; i < pointCount; i += 1) {
      const x = this.bridgeLeft + spacing * (i + 1);
      const glow = this.bridgeShowControlFx && hasControlGlow
        ? this.addBridgeVisual(this.add.image(x, bridgeY, "control_glow").setDisplaySize(36, 36).setAlpha(0.45).setDepth(3))
        : null;
      const rune = this.bridgeShowControlFx && hasControlRune
        ? this.addBridgeVisual(this.add.image(x, bridgeY, "control_rune").setDisplaySize(26, 26).setAlpha(0.85).setDepth(4))
        : null;
      const marker = this.addBridgeVisual(this.add.circle(x, bridgeY, 10, 0x323844, 0.8).setStrokeStyle(2, 0x5b616e, 1));
      const core = this.addBridgeVisual(this.add.circle(x, bridgeY, 5, 0x7b8598, 0.9));
      marker.setDepth(4);
      core.setDepth(5);
      this.controlPoints.push({
        index: i,
        x,
        y: bridgeY,
        owner: "neutral",
        progress: 0,
        glow,
        rune,
        marker,
        core,
        zone: new Phaser.Geom.Rectangle(
          x - this.controlZoneWidth / 2,
          bridgeY - this.controlZoneHeight / 2,
          this.controlZoneWidth,
          this.controlZoneHeight
        )
      });
    }
  }

  drawRope(graphics, x1, x2, y, sag) {
    const steps = 18;
    graphics.beginPath();
    graphics.moveTo(x1, y);
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = Phaser.Math.Linear(x1, x2, t);
      const yOffset = Math.sin(t * Math.PI) * sag;
      graphics.lineTo(x, y + yOffset);
    }
    graphics.strokePath();
  }

  createCastles() {
    const y = this.castleAnchorY;
    this.playerCastle = this.createCastle(this.castleXLeft, y, SIDE.PLAYER, 0x5f7685);
    this.aiCastle = this.createCastle(this.castleXRight, y, SIDE.AI, 0x8a5a5a);
  }

  createTurrets() {
    this.destroyTurrets();
    const offset = this.turretSideInset;
    const turretY = this.turretY;
    this.playerTurret = new Turret(this, SIDE.PLAYER, this.platformLeftEnd - offset, turretY, this.layoutProfile.turret);
    this.aiTurret = new Turret(this, SIDE.AI, this.platformRightStart + offset, turretY, this.layoutProfile.turret);
    if (this.playerTurrets) this.playerTurrets = [this.playerTurret];
    if (this.aiTurrets) this.aiTurrets = [this.aiTurret];
  }

  createCastle(x, y, side, color) {
    const castleVariant = this.getCastleVariant();
    const castleKey = castleVariant.useTwinMirror
      ? castleVariant.baseKey
      : side === SIDE.PLAYER
      ? "castle_base_player"
      : "castle_base_ai";
    const hasCastleBase = this.textures.exists(castleKey);

    let base;
    if (hasCastleBase) {
      base = this.add
        .image(x, y + this.castleBaseCenterYOffset, castleKey)
        .setDisplaySize(this.castleBaseWidth, this.castleBaseHeight)
        .setDepth(6);
      base.setFlipX(side === SIDE.PLAYER);
    } else {
      base = this.add.rectangle(x, y, 92, 120, color).setStrokeStyle(3, 0x20242f, 1).setDepth(6);
      this.add.rectangle(x, y + 22, 36, 48, 0x2a211e).setStrokeStyle(2, 0x161414, 1).setDepth(7);
      this.add.triangle(x, y - 90, -36, 20, 36, 20, 0, -20, 0x2a2f3a).setStrokeStyle(2, 0x1b1e27, 1).setDepth(7);
    }

    const hpBarWidth = this.castleHpBarWidth;
    const hpBarHeight = this.castleHpBarHeight;
    const hpBarX = x + (side === SIDE.PLAYER ? this.castleHpOffsetX : -this.castleHpOffsetX);
    const hpBarY = y + this.castleHpOffsetY;
    const hpFramePadding = 2;
    const hpBarFrame = this.add
      .rectangle(hpBarX, hpBarY, hpBarWidth + hpFramePadding * 2, hpBarHeight + hpFramePadding * 2, 0x10151f, 0.92)
      .setStrokeStyle(1, 0xe4d6b8, 0.9)
      .setDepth(9);
    const hpBarBack = this.add.rectangle(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 0x252d3a, 1).setDepth(10);
    const hpBarFill = this.add
      .rectangle(hpBarX - hpBarWidth * 0.5, hpBarY, hpBarWidth, hpBarHeight - 4, 0x79d27e)
      .setOrigin(0, 0.5)
      .setDepth(11);

    const baseTeamTint = side === SIDE.PLAYER ? 0xb5cee6 : 0xe1bbbb;
    if (hasCastleBase) base.setTint(baseTeamTint);

    return {
      side,
      x,
      y,
      maxHp: 900,
      hp: 900,
      base,
      baseIsSprite: hasCastleBase,
      baseTeamTint,
      tower: null,
      banner: null,
      hpBarFrame,
      hpBarBack,
      hpBarFill,
      hpBarWidth,
      takeDamage: (amount) => {
        const castle = side === SIDE.PLAYER ? this.playerCastle : this.aiCastle;
        castle.hp = Math.max(0, castle.hp - amount);
        if (castle.baseIsSprite) {
          base.setTintFill(0xffe0a3);
          this.time.delayedCall(120, () => base.setTint(castle.baseTeamTint));
        } else {
          base.setFillStyle(0xffe0a3);
          this.time.delayedCall(120, () => base.setFillStyle(color));
        }
        this.cameras.main.shake(80, 0.004);

        const key = side === SIDE.PLAYER ? "player" : "ai";
        const now = this.time.now;
        if (now - this.lastCastleHitLog[key] > 1600) {
          this.lastCastleHitLog[key] = now;
          this.events.emit("log", { type: "castle-hit", side });
        }
      }
    };
  }

  updateCastleHud() {
    const syncCastleBar = (castle) => {
      if (!castle?.hpBarFill || !castle.hpBarWidth) return;
      const ratio = Phaser.Math.Clamp(castle.hp / castle.maxHp, 0, 1);
      castle.hpBarFill.width = castle.hpBarWidth * ratio;
      const fillColor = ratio > 0.65 ? 0x79d27e : ratio > 0.35 ? 0xf0be64 : 0xd96c6c;
      castle.hpBarFill.setFillStyle(fillColor, 1);
      castle.hpBarFill.setVisible(ratio > 0.01);
    };

    syncCastleBar(this.playerCastle);
    syncCastleBar(this.aiCastle);
  }

  requestSpawn(type) {
    this.spawnDevUnits(type, SIDE.PLAYER, 1);
  }

  spawnDevUnits(type, side = SIDE.PLAYER, count = 1) {
    if (this.isGameOver) return false;
    if (!UNIT_TYPES[type]) return false;
    const total = Phaser.Math.Clamp(Number(count) || 1, 1, 24);
    const spread = 10;
    let spawned = 0;
    for (let i = 0; i < total; i += 1) {
      const offset = (i - (total - 1) / 2) * spread;
      const ok = this.spawnUnit(type, side, {
        payCost: false,
        offset,
        presenceMult: 1,
        modifiers: {}
      });
      if (ok) spawned += 1;
    }
    return spawned > 0;
  }

  createWaveDraft() {
    return {
      front: Array(this.waveSlots.front).fill(null),
      mid: Array(this.waveSlots.mid).fill(null),
      rear: Array(this.waveSlots.rear).fill(null)
    };
  }

  createGhostFormation() {
    const rows = ["front", "mid", "rear"];
    this.ghostFormation = { rows: {} };
    for (const row of rows) {
      const count = this.waveSlots[row] || 0;
      this.ghostFormation.rows[row] = [];
      for (let i = 0; i < count; i += 1) {
        const container = this.add.container(0, 0);
        container.setAlpha(this.ghostAlpha);
        container.setDepth(1);
        container.setVisible(false);
        this.ghostFormation.rows[row].push({ container, currentType: null });
      }
    }
  }

  updateGhostFormation() {
    if (!this.ghostFormation) return;
    const draft = this.playerDraft;
    const zone = this.getPlatformZone(SIDE.PLAYER, 0);
    const rows = ["front", "mid", "rear"];

    const rowX = {
      rear: zone.x + zone.width * 0.22,
      mid: zone.x + zone.width * 0.5,
      front: zone.x + zone.width * 0.78
    };

    for (const row of rows) {
      const slots = this.waveSlots[row] || 0;
      const padding = 8;
      const step = slots > 0 ? (zone.height - padding * 2) / slots : 0;
      const list = draft[row] || [];
      const ghosts = this.ghostFormation.rows[row] || [];
      for (let i = 0; i < ghosts.length; i += 1) {
        const ghost = ghosts[i];
        const typeId = list[i];
        const x = rowX[row];
        const y = zone.y + padding + step * (i + 0.5);
        ghost.container.setPosition(x, y);
        if (!typeId) {
          ghost.container.setVisible(false);
          ghost.currentType = null;
          continue;
        }
        if (ghost.currentType !== typeId) {
          ghost.container.removeAll(true);
          const shapes = this.buildGhostShapes(typeId);
          ghost.container.add(shapes);
          ghost.currentType = typeId;
        }
        ghost.container.setVisible(true);
      }
    }
  }

  buildGhostShapes(typeId) {
    const config = UNIT_TYPES[typeId];
    if (!config) return [];
    const role = config.role;
    const size = role === "frontline" ? 40 : role === "damage" ? 32 : 34;
    const color = config.color;
    const shapes = [];

    if (typeId === "guard") {
      const body = this.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
      const shield = this.add.rectangle(-size * 0.2, 0, size * 0.35, size * 0.6, 0xd6c8a7);
      shapes.push(body, shield);
      return shapes;
    }
    if (typeId === "archer") {
      const body = this.add.rectangle(0, 0, size * 0.7, size * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
      const bow = this.add.rectangle(size * 0.35, 0, size * 0.15, size * 0.9, 0xe7d9b8);
      shapes.push(body, bow);
      return shapes;
    }
    if (typeId === "cleric") {
      const body = this.add.circle(0, 0, size * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
      const halo = this.add.circle(0, -size * 0.55, size * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
      shapes.push(body, halo);
      return shapes;
    }
    if (typeId === "charger") {
      const body = this.add.triangle(0, 0, -size * 0.6, size * 0.5, size * 0.6, size * 0.5, 0, -size * 0.6, color);
      body.setStrokeStyle(2, 0x1c1f27, 1);
      const horn = this.add.rectangle(0, -size * 0.1, size * 0.6, size * 0.12, 0xf0d39a);
      shapes.push(body, horn);
      return shapes;
    }

    const body = this.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
    shapes.push(body);
    return shapes;
  }

  getWaveInterval(elapsed) {
    let interval = this.waveSchedule[0].interval;
    for (const stage of this.waveSchedule) {
      if (elapsed >= stage.time) interval = stage.interval;
    }
    return interval;
  }

  getStageIndex(elapsed = this.matchTime) {
    let stageIndex = 0;
    for (let i = 0; i < this.waveSchedule.length; i += 1) {
      if (elapsed >= this.waveSchedule[i].time) stageIndex = i;
    }
    return stageIndex;
  }

  getPhaseLabel() {
    const stageIndex = this.getStageIndex();
    const phaseLabels = ["Early", "Mid", "Late", "Final"];
    return phaseLabels[stageIndex] || `Phase ${stageIndex + 1}`;
  }

  getUnlockedWaveColumns(stageIndex = this.getStageIndex()) {
    const baseUnlocked = 2;
    const maxColumns = Math.max(1, this.waveSlots?.front || 4);
    return Phaser.Math.Clamp(baseUnlocked + stageIndex, 0, maxColumns);
  }

  buildUiState() {
    return {
      playerResources: this.playerResources,
      playerIncome: this.getIncomeDetails(SIDE.PLAYER).total,
      aiResources: this.aiResources,
      aiIncome: this.getIncomeDetails(SIDE.AI).total,
      playerCastle: {
        hp: this.playerCastle?.hp || 0,
        maxHp: this.playerCastle?.maxHp || 1
      },
      aiCastle: {
        hp: this.aiCastle?.hp || 0,
        maxHp: this.aiCastle?.maxHp || 1
      },
      controlPoints: (this.controlPoints || []).map((point) => point.owner),
      wave: {
        countdown: this.waveCountdown,
        interval: this.getWaveInterval(this.matchTime || 0),
        locked: this.waveLocked,
        number: this.waveNumber || 0,
        phaseLabel: this.getPhaseLabel(),
        stageIndex: this.getStageIndex(),
        unlockedColumns: this.getUnlockedWaveColumns()
      },
      shop: {
        offers: this.shop?.player?.offers || [],
        rerollCost: this.getRerollCost(SIDE.PLAYER),
        canReroll: this.playerResources >= this.getRerollCost(SIDE.PLAYER) && !this.isGameOver && !this.waveLocked
      },
      waveDraft: this.playerDraft,
      waveSupply: this.waveSupply,
      waveSlots: this.waveSlots,
      waveStance: this.waveStance?.player || "normal",
      abilityCooldowns: this.abilityCooldowns,
      isGameOver: this.isGameOver
    };
  }

  emitUiState() {
    this.events.emit("ui-state", this.buildUiState());
  }

  getTierCap() {
    const stageIndex = this.getStageIndex();
    const caps = SHOP_CONFIG.stageTierCaps;
    return caps[Math.min(stageIndex, caps.length - 1)];
  }

  getEligibleShopUnits() {
    const stageIndex = this.getStageIndex();
    const tierCap = this.getTierCap();
    return Object.values(UNIT_TYPES).filter(
      (unit) => unit.stageMin <= stageIndex && unit.tier <= tierCap
    );
  }

  pickWeighted(units) {
    const total = units.reduce((sum, unit) => sum + (unit.shopWeight || 1), 0);
    let roll = Phaser.Math.FloatBetween(0, total);
    for (const unit of units) {
      roll -= unit.shopWeight || 1;
      if (roll <= 0) return unit;
    }
    return units[units.length - 1];
  }

  rollShopOffers(side, resetRerolls = false) {
    const shop = this.shop[side];
    if (!shop) return;
    if (resetRerolls) shop.rerolls = 0;

    const eligible = this.getEligibleShopUnits();
    if (eligible.length === 0) {
      shop.offers = [];
      return;
    }

    const offers = [];
    let pool = [...eligible];
    const stageIndex = this.getStageIndex();
    const guarantees = stageIndex === 0 ? SHOP_CONFIG.earlyRoleGuarantees : [];

    for (const role of guarantees) {
      const rolePool = pool.filter((unit) => unit.role === role);
      if (rolePool.length === 0) continue;
      const pick = this.pickWeighted(rolePool);
      offers.push(pick.id);
      pool = pool.filter((unit) => unit.id !== pick.id);
    }

    while (offers.length < SHOP_CONFIG.offersPerWave && pool.length > 0) {
      const pick = this.pickWeighted(pool);
      offers.push(pick.id);
      pool = pool.filter((unit) => unit.id !== pick.id);
    }

    while (offers.length < SHOP_CONFIG.offersPerWave) {
      const pick = this.pickWeighted(eligible);
      offers.push(pick.id);
    }

    shop.offers = offers;
  }

  getRerollCost(side) {
    const shop = this.shop[side];
    if (!shop) return SHOP_CONFIG.baseRerollCost;
    return SHOP_CONFIG.baseRerollCost + shop.rerolls * SHOP_CONFIG.rerollCostGrowth;
  }

  requestShopReroll(side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;
    const cost = this.getRerollCost(side);
    if (side === SIDE.PLAYER) {
      if (this.playerResources < cost) return false;
      this.playerResources -= cost;
    } else {
      if (this.aiResources < cost) return false;
      this.aiResources -= cost;
    }
    this.shop[side].rerolls += 1;
    this.rollShopOffers(side, false);
    this.emitResourceUpdate();
    return true;
  }

  isShopUnitAvailable(side, type) {
    const shop = this.shop[side];
    if (!shop) return false;
    return shop.offers.includes(type);
  }

  claimShopOffer(side, type) {
    const shop = this.shop[side];
    if (!shop) return false;
    const index = shop.offers.indexOf(type);
    if (index === -1) return false;
    shop.offers[index] = null;
    return true;
  }

  isShopSoldOut(side) {
    const shop = this.shop[side];
    if (!shop || !Array.isArray(shop.offers) || shop.offers.length === 0) return false;
    return shop.offers.every((offer) => !offer);
  }

  selectStance(payload, side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;
    const id = typeof payload === "string" ? payload : payload.id;
    if (!STANCES[id]) return false;
    this.waveStance[side] = id;
    return true;
  }

  getStance(side) {
    const id = this.waveStance[side] || "normal";
    return STANCES[id] || STANCES.normal;
  }

  getDraft(side) {
    return side === SIDE.PLAYER ? this.playerDraft : this.aiDraft;
  }

  getDraftSlotCount(draft) {
    return [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean).length;
  }

  getDraftSlotList(draft, slot) {
    if (slot === "front") return draft.front;
    if (slot === "rear") return draft.rear;
    return draft.mid;
  }

  getFirstAvailableSlot(draft, unlockedColumns) {
    const rows = ["front", "mid", "rear"];
    const maxColumns = Math.max(0, unlockedColumns || 0);
    for (const row of rows) {
      const list = this.getDraftSlotList(draft, row);
      if (!list) continue;
      const limit = Math.min(list.length, maxColumns);
      for (let i = 0; i < limit; i += 1) {
        if (list[i] === null) return { slot: row, index: i };
      }
    }
    return null;
  }

  queueUnit(payload, side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;

    const type = typeof payload === "string" ? payload : payload.id;
    const fromShop = typeof payload === "object" && payload.fromShop === true;
    let slot = typeof payload === "string" ? null : payload.slot || null;
    const index = typeof payload === "string" ? null : payload.index;

    const config = UNIT_TYPES[type];
    if (!config) return false;
    const cost = config.cost;
    const draft = this.getDraft(side);
    const unlockedColumns = this.getUnlockedWaveColumns();
    let targetIndex = null;
    const requiresShop = side === SIDE.PLAYER || side === SIDE.AI;
    if (requiresShop && !fromShop) return false;
    if (requiresShop && !this.isShopUnitAvailable(side, type)) return false;
    if (!slot) {
      const target = this.getFirstAvailableSlot(draft, unlockedColumns);
      if (!target) return false;
      slot = target.slot;
      if (typeof index !== "number") targetIndex = target.index;
    }
    const slotList = this.getDraftSlotList(draft, slot);
    if (!slotList) return false;
    const unlockedInRow = Math.min(unlockedColumns, slotList.length);

    const filledCount = this.getDraftSlotCount(draft);

    if (filledCount >= this.waveSupply) {
      return false;
    } else if (typeof index === "number") {
      if (index < 0 || index >= slotList.length) return false;
      if (index >= unlockedInRow) return false;
      if (slotList[index] !== null) return false;
      targetIndex = index;
    } else {
      let openIndex = -1;
      for (let i = 0; i < unlockedInRow; i += 1) {
        if (slotList[i] === null) {
          openIndex = i;
          break;
        }
      }
      if (openIndex === -1) return false;
      targetIndex = openIndex;
    }

    if (side === SIDE.PLAYER) {
      if (this.playerResources < cost) return false;
    } else {
      if (this.aiResources < cost) return false;
    }

    if (requiresShop && !this.claimShopOffer(side, type)) return false;

    if (side === SIDE.PLAYER) {
      this.playerResources -= cost;
    } else {
      this.aiResources -= cost;
    }

    slotList[targetIndex] = type;

    if (requiresShop && this.isShopSoldOut(side)) {
      this.rollShopOffers(side, false);
    }

    this.emitResourceUpdate();
    return true;
  }

  removeQueuedUnit(payload, side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;

    const type = typeof payload === "string" ? payload : payload.id;
    const slot = typeof payload === "string" ? null : payload.slot || null;
    const index = typeof payload === "string" ? null : payload.index;
    const config = UNIT_TYPES[type];
    if (!config) return false;
    const draft = this.getDraft(side);

    const removeFrom = (list) => {
      const slotIndex = list.lastIndexOf(type);
      if (slotIndex === -1) return false;
      list[slotIndex] = null;
      return true;
    };

    let removed = false;
    if (typeof index === "number" && slot) {
      const list = this.getDraftSlotList(draft, slot);
      if (!list || index < 0 || index >= list.length) return false;
      if (!list[index]) return false;
      list[index] = null;
      removed = true;
    } else if (slot === "front") removed = removeFrom(draft.front);
    else if (slot === "rear") removed = removeFrom(draft.rear);
    else if (slot === "mid") removed = removeFrom(draft.mid);
    else {
      removed = removeFrom(draft.rear) || removeFrom(draft.mid) || removeFrom(draft.front);
    }
    if (!removed) return false;

    return true;
  }

  moveQueuedUnit(payload, side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;
    if (!payload?.from || !payload?.to) return false;

    const draft = this.getDraft(side);
    const unlockedColumns = this.getUnlockedWaveColumns();
    const fromRow = payload.from.row;
    const toRow = payload.to.row;
    const fromIndex = Number(payload.from.index);
    const toIndex = Number(payload.to.index);

    const fromList = this.getDraftSlotList(draft, fromRow);
    const toList = this.getDraftSlotList(draft, toRow);
    if (!fromList || !toList) return false;
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return false;
    if (fromIndex < 0 || fromIndex >= fromList.length) return false;
    if (toIndex < 0 || toIndex >= toList.length) return false;
    if (toIndex >= Math.min(unlockedColumns, toList.length)) return false;

    const fromId = fromList[fromIndex];
    if (!fromId) return false;
    const toId = toList[toIndex];

    fromList[fromIndex] = toId || null;
    toList[toIndex] = fromId;
    return true;
  }

  sendWave(side) {
    if (this.isGameOver) return;
    const draft = this.getDraft(side);
    const waveUnits = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    if (waveUnits.length === 0) return;

    const count = Math.min(waveUnits.length, this.waveSupply);
    const ordered = waveUnits.slice(0, count);
    const spread = 12;
    const roleCounts = ordered.reduce((acc, id) => {
      const role = UNIT_TYPES[id]?.role || "unknown";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    const roleMult = {};
    Object.keys(roleCounts).forEach((role) => {
      const extra = Math.max(0, roleCounts[role] - 3);
      roleMult[role] = Math.max(0.6, 1 - extra * 0.1);
    });

    const stance = this.getStance(side);
    const stanceMods = stance.modifiers || {};
    const stancePresence = stanceMods.presenceMult || 1;

    draft.front = Array(this.waveSlots.front).fill(null);
    draft.mid = Array(this.waveSlots.mid).fill(null);
    draft.rear = Array(this.waveSlots.rear).fill(null);

    ordered.forEach((type, index) => {
      const offset = (index - (count - 1) / 2) * spread;
      const delay = index * this.waveStagger * 1000;
      const presenceMult = (roleMult[UNIT_TYPES[type]?.role || "unknown"] || 1) * stancePresence;
      this.time.delayedCall(delay, () => {
        this.spawnUnit(type, side, { payCost: false, offset, presenceMult, modifiers: stanceMods });
      });
    });

    this.events.emit("log", { type: "wave", side, count });
  }

  spawnUnit(type, side, options = {}) {
    if (this.isGameOver) return false;
    const { payCost = true, offset = 0, presenceMult = 1, modifiers = {} } = options;
    const config = UNIT_TYPES[type];
    if (!config) return false;
    const cost = config.cost;
    if (payCost) {
      if (side === SIDE.PLAYER) {
        if (this.playerResources < cost) return false;
        this.playerResources -= cost;
      } else {
        if (this.aiResources < cost) return false;
        this.aiResources -= cost;
      }
    }

    const spawnX =
      side === SIDE.PLAYER ? this.platformLeftStart + this.unitSpawnInset : this.platformRightEnd - this.unitSpawnInset;
    const unit = new Unit(this, config, side, spawnX + offset, this.unitLaneY, modifiers);
    unit.presenceMult = presenceMult;
    if (side === SIDE.PLAYER) {
      this.playerUnits.push(unit);
    } else {
      this.aiUnits.push(unit);
    }

    this.spawnPulse(spawnX + offset, this.unitLaneY, config.color);
    this.spawnCallout(spawnX + offset, this.unitLaneY + this.unitCalloutOffsetY, config.name, side);
    this.events.emit("log", { type: "spawn", side, name: config.name });
    if (payCost) this.emitResourceUpdate();
    return true;
  }

  spawnPulse(x, y, color) {
    const ring = this.add.circle(x, y, 10, color, 0.4);
    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 450,
      onComplete: () => ring.destroy()
    });
  }

  spawnCallout(x, y, text, side) {
    const label = this.add.text(x, y, text, {
      fontFamily: "Cinzel",
      fontSize: "14px",
      color: side === SIDE.PLAYER ? "#e7e2d8" : "#f4d2c4"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: y - 18,
      alpha: 0,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy()
    });
  }

  requestAbility(id) {
    if (this.isGameOver) return;
    const ability = ABILITIES[id];
    if (!ability) return;
    if (this.abilityCooldowns[id] > 0) return;
    this.abilityCooldowns[id] = ability.cooldown;

    if (id === "healWave") {
      this.castleHealWave(this.playerCastle, ability);
    }
    if (id === "pulse") {
      this.castlePulse(this.playerCastle, ability);
    }
    this.events.emit("log", { type: "ability", name: ability.name });
  }

  castleHealWave(castle, ability) {
    const radius = Math.max(this.playArea.width, this.playArea.height) * 0.75;
    const wave = this.add.circle(castle.x, castle.y, 20, 0x9fd6aa, 0.5);
    this.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: 500,
      onComplete: () => wave.destroy()
    });

    const label = this.add.text(castle.x, castle.y - 90, "Heal Wave", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#dff1da"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });

    for (const unit of this.playerUnits) {
      unit.heal(ability.amount);
    }
  }

  castlePulse(castle, ability) {
    const zone = this.getPlatformZone(SIDE.PLAYER, 40);
    const centerX = zone.x + zone.width / 2;
    const pulse = this.add.circle(centerX, castle.y, 30, 0xffd58a, 0.4);
    this.tweens.add({
      targets: pulse,
      radius: zone.width * 0.6,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy()
    });

    const label = this.add.text(castle.x, castle.y - 90, "Defensive Pulse", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#f2ddae"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });

    for (const unit of this.aiUnits) {
      if (Phaser.Geom.Rectangle.Contains(zone, unit.body.x, unit.body.y)) {
        unit.applyStatus({ type: "stun", duration: ability.stunDuration }, SIDE.PLAYER);
        unit.applyStatus({ type: "pushback", strength: ability.pushStrength }, SIDE.PLAYER);
      }
    }
  }

  gainResources() {
    const playerIncome = this.getIncomeDetails(SIDE.PLAYER);
    const aiIncome = this.getIncomeDetails(SIDE.AI);

    this.playerResources += playerIncome.total;
    this.aiResources += aiIncome.total;
    this.emitResourceUpdate();
  }

  emitResourceUpdate() {
    this.events.emit("resource-update", {
      player: this.playerResources,
      ai: this.aiResources,
      playerIncome: this.getIncomeDetails(SIDE.PLAYER).total,
      aiIncome: this.getIncomeDetails(SIDE.AI).total
    });
  }

  updateControlPoints() {
    let playerCount = 0;
    let aiCount = 0;

    for (const point of this.controlPoints) {
      let playerPresence = 0;
      let aiPresence = 0;

      for (const unit of this.playerUnits) {
        if (!unit.isAlive()) continue;
        if (Phaser.Geom.Rectangle.Contains(point.zone, unit.body.x, unit.body.y)) {
          playerPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }
      for (const unit of this.aiUnits) {
        if (!unit.isAlive()) continue;
        if (Phaser.Geom.Rectangle.Contains(point.zone, unit.body.x, unit.body.y)) {
          aiPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }

      const diff = playerPresence - aiPresence;
      if (Math.abs(diff) <= 0.2) {
        point.progress *= 0.9;
      } else {
        point.progress = Phaser.Math.Clamp(point.progress + diff * 0.12, -1, 1);
      }

      const prevOwner = point.owner;
      if (point.progress >= 0.4) point.owner = SIDE.PLAYER;
      else if (point.progress <= -0.4) point.owner = SIDE.AI;
      else point.owner = "neutral";

      if (point.owner !== prevOwner) {
        this.events.emit("log", { type: "point", index: point.index, owner: point.owner });
        const pulseTargets = [point.marker];
        if (point.rune) pulseTargets.push(point.rune);
        if (point.glow) pulseTargets.push(point.glow);
        this.tweens.add({ targets: pulseTargets, alpha: 0.95, duration: 140, yoyo: true });
      }

      if (point.owner === SIDE.PLAYER) playerCount += 1;
      if (point.owner === SIDE.AI) aiCount += 1;

      const tint =
        point.owner === SIDE.PLAYER
          ? 0x6fa3d4
          : point.owner === SIDE.AI
          ? 0xb36a6a
          : 0x3a3f4f;
      point.marker.setFillStyle(tint, 0.65);
      const coreTint = point.owner === SIDE.PLAYER ? 0x9ec9f0 : point.owner === SIDE.AI ? 0xf0b5b5 : 0x7b8598;
      point.core.setFillStyle(coreTint, 0.9);
      if (point.rune) {
        point.rune.setTint(coreTint);
        point.rune.setAlpha(0.8);
      }
      if (point.glow) {
        point.glow.setTint(tint);
        point.glow.setAlpha(point.owner === "neutral" ? 0.35 : 0.6);
      }
    }

    let newOwner = "neutral";
    if (playerCount > aiCount) newOwner = SIDE.PLAYER;
    if (aiCount > playerCount) newOwner = SIDE.AI;

    if (newOwner !== this.zoneOwner) {
      this.zoneOwner = newOwner;
      this.events.emit("zone-update", this.zoneOwner);
      this.events.emit("log", { type: "zone", owner: this.zoneOwner });
      this.cameras.main.shake(120, 0.002);
    }
  }

  getIncomeDetails(side) {
    const ownedPoints = this.controlPoints.filter((point) => point.owner === side);
    const base = this.baseIncome;
    let pointBonus = ownedPoints.length * this.pointBonus;
    let enemyBonus = 0;

    for (const point of ownedPoints) {
      if (this.isEnemyPoint(side, point.index)) {
        enemyBonus += this.enemyPointBonus;
      }
    }

    const resources = side === SIDE.PLAYER ? this.playerResources : this.aiResources;
    const interestBase = Math.min(resources, this.interestCap);
    const interest = interestBase * this.interestRate * this.interestTick;
    const total = base + pointBonus + enemyBonus + interest;

    return { base, pointBonus, enemyBonus, interest, total };
  }

  isEnemyPoint(side, index) {
    if (side === SIDE.PLAYER) return index >= 3;
    return index <= 1;
  }

  getPlatformZone(side, extra = 0) {
    const height = 90;
    if (side === SIDE.PLAYER) {
      return new Phaser.Geom.Rectangle(
        this.platformLeftStart,
        this.unitLaneY - height / 2,
        this.platformLeftEnd - this.platformLeftStart + extra,
        height
      );
    }
    return new Phaser.Geom.Rectangle(
      this.platformRightStart - extra,
      this.unitLaneY - height / 2,
      this.platformRightEnd - this.platformRightStart + extra,
      height
    );
  }

  computeBoardLayout() {
    const profile = this.layoutProfile;
    const mirrorCenterX = this.playArea.x + this.playArea.width / 2;
    const mirrorX = (x) => mirrorCenterX * 2 - x;

    if (profile.mirrorMode) {
      profile.castle.aiX = mirrorX(profile.castle.playerX);
      profile.decks.foundation.rightStart = mirrorX(profile.decks.foundation.leftEnd);
      profile.decks.foundation.rightEnd = mirrorX(profile.decks.foundation.leftStart);
      profile.decks.spawn.rightStart = mirrorX(profile.decks.spawn.leftEnd);
      profile.decks.spawn.rightEnd = mirrorX(profile.decks.spawn.leftStart);
    }

    profile.decks.foundation.leftEnd = Math.max(profile.decks.foundation.leftEnd, profile.decks.foundation.leftStart + 30);
    profile.decks.spawn.leftEnd = Math.max(profile.decks.spawn.leftEnd, profile.decks.spawn.leftStart + 30);
    profile.decks.foundation.rightEnd = Math.max(profile.decks.foundation.rightEnd, profile.decks.foundation.rightStart + 30);
    profile.decks.spawn.rightEnd = Math.max(profile.decks.spawn.rightEnd, profile.decks.spawn.rightStart + 30);

    this.castleXLeft = profile.castle.playerX;
    this.castleXRight = profile.castle.aiX;
    this.castleAnchorY = profile.castle.anchorY;

    this.castleBaseWidth = profile.castle.baseWidth;
    this.castleBaseHeight = profile.castle.baseHeight;
    this.castleBaseCenterYOffset = profile.castle.baseCenterYOffset;
    this.castleTowerWidth = profile.castle.towerWidth;
    this.castleTowerHeight = profile.castle.towerHeight;
    this.castleTowerOffsetY = profile.castle.towerOffsetY;
    this.castleBannerOffsetX = profile.castle.bannerOffsetX;
    this.castleBannerOffsetY = profile.castle.bannerOffsetY;
    this.castleHpOffsetX = profile.castle.hpOffsetX;
    this.castleHpOffsetY = profile.castle.hpOffsetY;
    this.castleHpBarWidth = profile.castle.hpWidth;
    this.castleHpBarHeight = profile.castle.hpHeight;

    this.castleFootY =
      this.castleAnchorY +
      this.castleBaseCenterYOffset +
      this.castleBaseHeight / 2 -
      CASTLE_METRICS.baseFootInset;

    this.foundationDeckY = profile.decks.foundation.topY;
    this.foundationDeckHeight = profile.decks.foundation.height;
    this.spawnDeckY = profile.decks.spawn.topY;
    this.spawnDeckHeight = profile.decks.spawn.height;
    this.bridgeY = profile.bridge.topY;

    this.bridgePlankY = profile.bridge.topY + profile.bridge.plankOffsetY;
    this.bridgeThickness = profile.bridge.thickness;
    this.bridgeShowPillars = Boolean(profile.bridge.showPillars);
    this.bridgeShowRopes = Boolean(profile.bridge.showRopes);
    this.bridgeShowControlFx = Boolean(profile.bridge.showControlFx);
    this.bridgeRopeTopY = profile.bridge.topY + profile.bridge.ropeTopOffset;
    this.bridgeRopeBottomY = profile.bridge.topY + profile.bridge.ropeBottomOffset;
    this.bridgePillarY = profile.bridge.topY + profile.bridge.pillarOffsetY;
    this.bridgePillarHeight = profile.bridge.pillarHeight;
    this.bridgePillarStep = profile.bridge.pillarStep;

    this.turretSideInset = profile.turret.sideInset;
    this.turretY = this.spawnDeckY + profile.turret.yOffset;

    this.unitSpawnInset = profile.units.spawnInset;
    this.unitLaneY = profile.units.laneY;
    this.unitCalloutOffsetY = profile.units.calloutOffsetY;

    this.controlY = profile.control.y;
    this.controlZoneWidth = profile.control.zoneWidth;
    this.controlZoneHeight = profile.control.zoneHeight;

    const leftFoundationStart = profile.decks.foundation.leftStart;
    const leftFoundationEnd = profile.decks.foundation.leftEnd;
    const leftSpawnStart = profile.decks.spawn.leftStart;
    const leftSpawnEnd = profile.decks.spawn.leftEnd;

    const rightFoundationStart = profile.decks.foundation.rightStart;
    const rightFoundationEnd = profile.decks.foundation.rightEnd;
    const rightSpawnStart = profile.decks.spawn.rightStart;
    const rightSpawnEnd = profile.decks.spawn.rightEnd;

    this.boardLayout = {
      leftFoundationStart,
      leftFoundationEnd,
      rightFoundationStart,
      rightFoundationEnd,
      leftSpawnStart,
      leftSpawnEnd,
      rightSpawnStart,
      rightSpawnEnd,
      bridgeLeft: leftSpawnEnd,
      bridgeRight: rightSpawnStart
    };
  }

  drawDeckSegment(startX, endX, topY, height, depth, hasPlatformTexture) {
    const width = endX - startX;
    const centerX = (startX + endX) / 2;
    const centerY = topY + height / 2;
    if (hasPlatformTexture) {
      this.addBridgeVisual(this.add.image(centerX, centerY, "platform_stone").setDisplaySize(width + 16, height).setDepth(depth));
      return;
    }
    this.addBridgeVisual(this.add.rectangle(centerX, centerY, width, height, 0x3a3430).setStrokeStyle(2, 0x241b18, 1).setDepth(depth));
  }

  loadLayoutProfile() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      this.layoutProfile = {
        ...this.layoutProfile,
        ...parsed,
        castle: { ...this.layoutProfile.castle, ...(parsed.castle || {}) },
        decks: {
          foundation: { ...this.layoutProfile.decks.foundation, ...(parsed.decks?.foundation || {}) },
          spawn: { ...this.layoutProfile.decks.spawn, ...(parsed.decks?.spawn || {}) }
        },
        bridge: { ...this.layoutProfile.bridge, ...(parsed.bridge || {}) },
        turret: { ...this.layoutProfile.turret, ...(parsed.turret || {}) },
        units: { ...this.layoutProfile.units, ...(parsed.units || {}) },
        control: { ...this.layoutProfile.control, ...(parsed.control || {}) }
      };
    } catch {
      // ignore malformed layout storage
    }
  }

  saveLayoutProfile() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.layoutProfile));
    } catch {
      // ignore storage limits
    }
  }

  exportLayoutProfile() {
    const text = JSON.stringify(this.layoutProfile, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        // ignore clipboard errors
      });
    }
    return text;
  }

  registerLayoutDevHotkeys() {
    if (!this.input?.keyboard) return;
    this.layoutDev = {
      enabled: false,
      selectedId: null,
      handles: [],
      pointerDown: false,
      dirty: false
    };
    this.layoutDevToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.layoutDevKeys = {
      shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    };

    this.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      if (!this.layoutDev?.enabled) return;
      const selected = this.layoutDev.handles.find((h) => h.id === this.layoutDev.selectedId);
      if (!selected || !selected.onWheel) return;
      selected.onWheel(dy);
      this.commitLayoutEdit();
    });
  }

  handleLayoutDevInput() {
    if (!this.layoutDev) return;
    if (this.layoutDevToggleKey && Phaser.Input.Keyboard.JustDown(this.layoutDevToggleKey)) {
      this.toggleLayoutDev();
    }
    if (!this.layoutDev.enabled || !this.input?.keyboard) return;

    const nudge = this.layoutDevKeys.shift.isDown ? 5 : 1;
    const selected = this.layoutDev.handles.find((h) => h.id === this.layoutDev.selectedId);
    if (!selected || !selected.set) return;

    const pos = selected.get();
    let changed = false;
    if (this.input.keyboard.checkDown(this.layoutDevKeys.left, 30)) {
      pos.x -= nudge;
      changed = true;
    }
    if (this.input.keyboard.checkDown(this.layoutDevKeys.right, 30)) {
      pos.x += nudge;
      changed = true;
    }
    if (this.input.keyboard.checkDown(this.layoutDevKeys.up, 30)) {
      pos.y -= nudge;
      changed = true;
    }
    if (this.input.keyboard.checkDown(this.layoutDevKeys.down, 30)) {
      pos.y += nudge;
      changed = true;
    }
    if (changed) {
      selected.set(pos.x, pos.y);
      this.commitLayoutEdit();
    }
  }

  toggleLayoutDev() {
    this.layoutDev.enabled = !this.layoutDev.enabled;
    if (this.layoutDev.enabled) {
      this.clearCombatUnits();
      this.setupLayoutHandles();
      this.layoutDev.selectedId = this.layoutDev.handles[0]?.id || null;
      this.syncLayoutDevPanel();
      return;
    }
    this.destroyLayoutHandles();
    this.syncLayoutDevPanel();
  }

  createLayoutDevPanel() {
    if (typeof document === "undefined") return;
    const panel = document.createElement("div");
    panel.id = "layout-dev-panel";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.top = "16px";
    panel.style.width = "300px";
    panel.style.padding = "10px";
    panel.style.background = "rgba(11, 14, 20, 0.88)";
    panel.style.border = "1px solid rgba(180, 188, 204, 0.35)";
    panel.style.borderRadius = "8px";
    panel.style.color = "#e8edf7";
    panel.style.font = "12px/1.4 monospace";
    panel.style.zIndex = "9999";
    panel.style.display = "none";
    panel.innerHTML = `
      <div style="margin-bottom:6px; font-weight:700;">Layout Dev Tool</div>
      <div style="margin-bottom:8px; opacity:0.85;">Toggle: K. Drag handles to move, wheel to resize selected.</div>
      <div data-layout-info style="margin-bottom:8px; min-height:48px;"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button data-layout-copy type="button">Copy JSON</button>
        <button data-layout-save type="button">Save</button>
        <button data-layout-reset type="button">Reset</button>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-mirror type="checkbox" checked /> Mirror
        </label>
      </div>
      <div style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap;">
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-pillars type="checkbox" /> Pillars
        </label>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-ropes type="checkbox" /> Ropes
        </label>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-controlfx type="checkbox" /> Control FX
        </label>
      </div>
    `;
    document.body.appendChild(panel);

    const copyBtn = panel.querySelector("[data-layout-copy]");
    const saveBtn = panel.querySelector("[data-layout-save]");
    const resetBtn = panel.querySelector("[data-layout-reset]");
    const mirrorBox = panel.querySelector("[data-layout-mirror]");
    const pillarsBox = panel.querySelector("[data-layout-pillars]");
    const ropesBox = panel.querySelector("[data-layout-ropes]");
    const controlFxBox = panel.querySelector("[data-layout-controlfx]");

    copyBtn?.addEventListener("click", () => this.exportLayoutProfile());
    saveBtn?.addEventListener("click", () => this.saveLayoutProfile());
    resetBtn?.addEventListener("click", () => {
      this.layoutProfile = createDefaultLayoutProfile(this.playArea);
      this.computeBoardLayout();
      this.rebuildLayoutVisuals();
      this.setupLayoutHandles();
      this.saveLayoutProfile();
      this.syncLayoutDevPanel();
    });
    mirrorBox?.addEventListener("change", (event) => {
      this.layoutProfile.mirrorMode = Boolean(event.target?.checked);
      this.commitLayoutEdit();
    });
    pillarsBox?.addEventListener("change", (event) => {
      this.layoutProfile.bridge.showPillars = Boolean(event.target?.checked);
      this.commitLayoutEdit();
    });
    ropesBox?.addEventListener("change", (event) => {
      this.layoutProfile.bridge.showRopes = Boolean(event.target?.checked);
      this.commitLayoutEdit();
    });
    controlFxBox?.addEventListener("change", (event) => {
      this.layoutProfile.bridge.showControlFx = Boolean(event.target?.checked);
      this.commitLayoutEdit();
    });

    this.layoutDevPanel = panel;
  }

  destroyLayoutDevPanel() {
    this.destroyLayoutHandles();
    if (this.layoutDevPanel?.parentElement) {
      this.layoutDevPanel.parentElement.removeChild(this.layoutDevPanel);
    }
    this.layoutDevPanel = null;
  }

  syncLayoutDevPanel() {
    if (!this.layoutDevPanel) return;
    this.layoutDevPanel.style.display = this.layoutDev?.enabled ? "block" : "none";
    const info = this.layoutDevPanel.querySelector("[data-layout-info]");
    const mirror = this.layoutDevPanel.querySelector("[data-layout-mirror]");
    const pillars = this.layoutDevPanel.querySelector("[data-layout-pillars]");
    const ropes = this.layoutDevPanel.querySelector("[data-layout-ropes]");
    const controlFx = this.layoutDevPanel.querySelector("[data-layout-controlfx]");
    if (mirror) mirror.checked = Boolean(this.layoutProfile?.mirrorMode);
    if (pillars) pillars.checked = Boolean(this.layoutProfile?.bridge?.showPillars);
    if (ropes) ropes.checked = Boolean(this.layoutProfile?.bridge?.showRopes);
    if (controlFx) controlFx.checked = Boolean(this.layoutProfile?.bridge?.showControlFx);
    if (!info) return;
    if (!this.layoutDev?.enabled) {
      info.textContent = "";
      return;
    }
    const selected = this.layoutDev.handles.find((h) => h.id === this.layoutDev.selectedId);
    if (!selected) {
      info.textContent = "No selection";
      return;
    }
    const pos = selected.get();
    info.textContent = `${selected.label}  x:${Math.round(pos.x)} y:${Math.round(pos.y)}`;
  }

  setupLayoutHandles() {
    this.destroyLayoutHandles();
    const makeHandle = (id, label, color, get, set, onWheel) => {
      const p = get();
      const dot = this.add.circle(p.x, p.y, 9, color, 0.95).setDepth(100).setStrokeStyle(2, 0x10131b, 1);
      const txt = this.add.text(p.x + 12, p.y - 8, label, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f0f4ff"
      }).setDepth(101);
      dot.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(dot);
      const handle = { id, label, dot, txt, get, set, onWheel };
      dot.on("pointerdown", () => {
        this.layoutDev.selectedId = id;
        this.refreshLayoutHandles();
        this.syncLayoutDevPanel();
      });
      dot.on("drag", (_pointer, dragX, dragY) => {
        set(dragX, dragY);
        this.commitLayoutEdit();
      });
      this.layoutDev.handles.push(handle);
    };

    makeHandle(
      "castle-player",
      "Castle",
      0x7bb1d8,
      () => ({ x: this.layoutProfile.castle.playerX, y: this.layoutProfile.castle.anchorY }),
      (x, y) => {
        this.layoutProfile.castle.playerX = x;
        this.layoutProfile.castle.anchorY = y;
      },
      (dy) => {
        const mult = dy > 0 ? 0.98 : 1.02;
        this.layoutProfile.castle.baseWidth = Phaser.Math.Clamp(this.layoutProfile.castle.baseWidth * mult, 80, 260);
        this.layoutProfile.castle.baseHeight = Phaser.Math.Clamp(this.layoutProfile.castle.baseHeight * mult, 110, 320);
        this.layoutProfile.castle.towerWidth = Phaser.Math.Clamp(this.layoutProfile.castle.towerWidth * mult, 40, 180);
        this.layoutProfile.castle.towerHeight = Phaser.Math.Clamp(this.layoutProfile.castle.towerHeight * mult, 30, 150);
      }
    );

    makeHandle(
      "castle-hp",
      "HP Bar",
      0x95d79a,
      () => ({
        x: this.castleXLeft + this.layoutProfile.castle.hpOffsetX,
        y: this.layoutProfile.castle.anchorY + this.layoutProfile.castle.hpOffsetY
      }),
      (x, y) => {
        this.layoutProfile.castle.hpOffsetX = x - this.castleXLeft;
        this.layoutProfile.castle.hpOffsetY = y - this.layoutProfile.castle.anchorY;
      },
      (dy) => {
        const mult = dy > 0 ? 0.97 : 1.03;
        this.layoutProfile.castle.hpWidth = Phaser.Math.Clamp(this.layoutProfile.castle.hpWidth * mult, 120, 420);
        this.layoutProfile.castle.hpHeight = Phaser.Math.Clamp(this.layoutProfile.castle.hpHeight * mult, 10, 48);
      }
    );

    makeHandle(
      "foundation-left-start",
      "Found L",
      0x9aa7ba,
      () => ({ x: this.layoutProfile.decks.foundation.leftStart, y: this.layoutProfile.decks.foundation.topY }),
      (x, y) => {
        this.layoutProfile.decks.foundation.leftStart = x;
        this.layoutProfile.decks.foundation.topY = y;
      },
      (dy) => {
        this.layoutProfile.decks.foundation.height = Phaser.Math.Clamp(this.layoutProfile.decks.foundation.height + (dy > 0 ? -2 : 2), 30, 160);
      }
    );

    makeHandle(
      "foundation-left-end",
      "Found R",
      0x9aa7ba,
      () => ({ x: this.layoutProfile.decks.foundation.leftEnd, y: this.layoutProfile.decks.foundation.topY }),
      (x, y) => {
        this.layoutProfile.decks.foundation.leftEnd = Math.max(x, this.layoutProfile.decks.foundation.leftStart + 20);
        this.layoutProfile.decks.foundation.topY = y;
      }
    );

    makeHandle(
      "spawn-left-start",
      "Spawn L",
      0xd9bf8b,
      () => ({ x: this.layoutProfile.decks.spawn.leftStart, y: this.layoutProfile.decks.spawn.topY }),
      (x, y) => {
        this.layoutProfile.decks.spawn.leftStart = x;
        this.layoutProfile.decks.spawn.topY = y;
      },
      (dy) => {
        this.layoutProfile.decks.spawn.height = Phaser.Math.Clamp(this.layoutProfile.decks.spawn.height + (dy > 0 ? -2 : 2), 24, 140);
      }
    );

    makeHandle(
      "spawn-left-end",
      "Spawn R",
      0xd9bf8b,
      () => ({ x: this.layoutProfile.decks.spawn.leftEnd, y: this.layoutProfile.decks.spawn.topY }),
      (x, y) => {
        this.layoutProfile.decks.spawn.leftEnd = Math.max(x, this.layoutProfile.decks.spawn.leftStart + 20);
        this.layoutProfile.decks.spawn.topY = y;
      }
    );

    makeHandle(
      "bridge-left",
      "Bridge L",
      0xb6c6a2,
      () => ({ x: this.layoutProfile.decks.spawn.leftEnd, y: this.layoutProfile.bridge.topY }),
      (x, y) => {
        this.layoutProfile.decks.spawn.leftEnd = x;
        this.layoutProfile.bridge.topY = y;
      },
      (dy) => {
        this.layoutProfile.bridge.thickness = Phaser.Math.Clamp(this.layoutProfile.bridge.thickness + (dy > 0 ? -2 : 2), 18, 100);
      }
    );

    makeHandle(
      "bridge-thickness",
      "Bridge H",
      0x9ed592,
      () => ({ x: this.width / 2, y: this.layoutProfile.bridge.topY + this.layoutProfile.bridge.plankOffsetY + this.layoutProfile.bridge.thickness / 2 }),
      (_x, y) => {
        this.layoutProfile.bridge.thickness = Phaser.Math.Clamp((y - (this.layoutProfile.bridge.topY + this.layoutProfile.bridge.plankOffsetY)) * 2, 14, 120);
      },
      (dy) => {
        this.layoutProfile.bridge.thickness = Phaser.Math.Clamp(this.layoutProfile.bridge.thickness + (dy > 0 ? -2 : 2), 14, 120);
      }
    );

    makeHandle(
      "turret-player",
      "Turret",
      0x84c5c0,
      () => ({ x: this.platformLeftEnd - this.layoutProfile.turret.sideInset, y: this.spawnDeckY + this.layoutProfile.turret.yOffset }),
      (x, y) => {
        this.layoutProfile.turret.sideInset = this.platformLeftEnd - x;
        this.layoutProfile.turret.yOffset = y - this.spawnDeckY;
      },
      (dy) => {
        const mult = dy > 0 ? 0.96 : 1.04;
        this.layoutProfile.turret.baseWidth = Phaser.Math.Clamp(this.layoutProfile.turret.baseWidth * mult, 20, 120);
        this.layoutProfile.turret.baseHeight = Phaser.Math.Clamp(this.layoutProfile.turret.baseHeight * mult, 16, 100);
        this.layoutProfile.turret.headWidth = Phaser.Math.Clamp(this.layoutProfile.turret.headWidth * mult, 18, 140);
        this.layoutProfile.turret.headHeight = Phaser.Math.Clamp(this.layoutProfile.turret.headHeight * mult, 18, 140);
      }
    );

    makeHandle(
      "turret-hp",
      "Turret HP",
      0x8fd6ff,
      () => ({
        x: this.platformLeftEnd - this.layoutProfile.turret.sideInset + this.layoutProfile.turret.hpOffsetX,
        y: this.spawnDeckY + this.layoutProfile.turret.yOffset + this.layoutProfile.turret.hpOffsetY
      }),
      (x, y) => {
        const turretX = this.platformLeftEnd - this.layoutProfile.turret.sideInset;
        const turretY = this.spawnDeckY + this.layoutProfile.turret.yOffset;
        this.layoutProfile.turret.hpOffsetX = x - turretX;
        this.layoutProfile.turret.hpOffsetY = y - turretY;
      },
      (dy) => {
        const mult = dy > 0 ? 0.97 : 1.03;
        this.layoutProfile.turret.hpWidth = Phaser.Math.Clamp(this.layoutProfile.turret.hpWidth * mult, 20, 140);
        this.layoutProfile.turret.hpHeight = Phaser.Math.Clamp(this.layoutProfile.turret.hpHeight * mult, 3, 24);
      }
    );

    makeHandle(
      "unit-spawn-player",
      "Unit Spawn",
      0xe2a58a,
      () => ({ x: this.platformLeftStart + this.layoutProfile.units.spawnInset, y: this.layoutProfile.units.laneY }),
      (x, y) => {
        this.layoutProfile.units.spawnInset = x - this.platformLeftStart;
        this.layoutProfile.units.laneY = y;
      }
    );

    makeHandle(
      "control-line",
      "Control",
      0xc99ce4,
      () => ({ x: this.width / 2, y: this.layoutProfile.control.y }),
      (_x, y) => {
        this.layoutProfile.control.y = y;
      },
      (dy) => {
        this.layoutProfile.control.zoneWidth = Phaser.Math.Clamp(this.layoutProfile.control.zoneWidth + (dy > 0 ? -4 : 4), 40, 220);
      }
    );

    this.refreshLayoutHandles();
  }

  refreshLayoutHandles() {
    if (!this.layoutDev?.handles) return;
    for (const handle of this.layoutDev.handles) {
      const p = handle.get();
      handle.dot.setPosition(p.x, p.y);
      handle.txt.setPosition(p.x + 12, p.y - 8);
      handle.dot.setScale(this.layoutDev.selectedId === handle.id ? 1.2 : 1);
      handle.txt.setAlpha(this.layoutDev.selectedId === handle.id ? 1 : 0.7);
    }
  }

  destroyLayoutHandles() {
    if (!this.layoutDev?.handles) return;
    for (const handle of this.layoutDev.handles) {
      handle.dot.destroy();
      handle.txt.destroy();
    }
    this.layoutDev.handles = [];
    this.layoutDev.selectedId = null;
  }

  commitLayoutEdit() {
    this.computeBoardLayout();
    this.rebuildLayoutVisuals();
    this.refreshLayoutHandles();
    this.saveLayoutProfile();
    this.syncLayoutDevPanel();
  }

  addBridgeVisual(obj) {
    this.bridgeVisuals.push(obj);
    return obj;
  }

  clearBridgeVisuals() {
    for (const obj of this.bridgeVisuals || []) {
      obj.destroy();
    }
    this.bridgeVisuals = [];
  }

  destroyCastles() {
    const destroyCastle = (castle) => {
      if (!castle) return;
      castle.base?.destroy();
      castle.tower?.destroy();
      castle.banner?.destroy();
      castle.hpBarFrame?.destroy();
      castle.hpBarBack?.destroy();
      castle.hpBarFill?.destroy();
    };
    destroyCastle(this.playerCastle);
    destroyCastle(this.aiCastle);
    this.playerCastle = null;
    this.aiCastle = null;
  }

  destroyTurrets() {
    if (this.playerTurret) this.playerTurret.destroy();
    if (this.aiTurret) this.aiTurret.destroy();
    this.playerTurret = null;
    this.aiTurret = null;
  }

  rebuildLayoutVisuals() {
    this.clearBridgeVisuals();
    this.destroyCastles();
    this.destroyTurrets();
    this.createBridge();
    this.createCastles();
    this.createTurrets();
    this.updateGhostFormation();
  }

  clearCombatUnits() {
    for (const unit of this.playerUnits || []) unit.destroy();
    for (const unit of this.aiUnits || []) unit.destroy();
    this.playerUnits = [];
    this.aiUnits = [];
  }

  cleanupUnits() {
    const beforePlayer = this.playerUnits.length;
    const beforeAi = this.aiUnits.length;

    this.playerUnits = this.playerUnits.filter((unit) => {
      if (unit.isAlive() || !unit.isReadyForCleanup()) return true;
      unit.destroy();
      return false;
    });

    this.aiUnits = this.aiUnits.filter((unit) => {
      if (unit.isAlive() || !unit.isReadyForCleanup()) return true;
      unit.destroy();
      return false;
    });

    const deadPlayer = beforePlayer - this.playerUnits.length;
    const deadAi = beforeAi - this.aiUnits.length;
    if (deadPlayer > 0) {
      this.aiResources += this.killBonus * deadPlayer;
    }
    if (deadAi > 0) {
      this.playerResources += this.killBonus * deadAi;
    }
    if (deadPlayer > 0 || deadAi > 0) {
      this.emitResourceUpdate();
    }
  }

  checkGameOver() {
    if (this.playerCastle.hp <= 0 || this.aiCastle.hp <= 0) {
      this.isGameOver = true;
      const winner = this.playerCastle.hp <= 0 ? "AI" : "Player";
      this.events.emit("game-over", winner);
      this.time.addEvent({
        delay: 100,
        callback: () => {
          this.playerUnits.forEach((unit) => unit.destroy());
          this.aiUnits.forEach((unit) => unit.destroy());
        }
      });
    }
  }

  aiDecision() {
    if (this.isGameOver) return;
    if (this.waveLocked) return;
    const aiPoints = this.controlPoints.filter((point) => point.owner === SIDE.AI).length;
    const playerPoints = this.controlPoints.filter((point) => point.owner === SIDE.PLAYER).length;
    let stanceId = "normal";
    if (this.aiCastle.hp < this.playerCastle.hp * 0.85) stanceId = "defensive";
    else if (aiPoints < playerPoints) stanceId = "aggressive";
    this.selectStance({ id: stanceId }, SIDE.AI);
    const offers = (this.shop.ai?.offers || []).filter(Boolean);
    if (offers.length === 0) return;

    const draft = this.aiDraft || { front: [], mid: [], rear: [] };
    const queued = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    const queuedRoles = queued.reduce(
      (acc, id) => {
        const role = UNIT_TYPES[id]?.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { frontline: 0, damage: 0, support: 0, disruptor: 0 }
    );

    const pickOffer = (role) => offers.find((id) => UNIT_TYPES[id]?.role === role);
    const pickAffordable = () => {
      const affordable = offers.filter((id) => UNIT_TYPES[id]?.cost <= this.aiResources);
      if (affordable.length === 0) return null;
      return affordable.sort((a, b) => UNIT_TYPES[a].cost - UNIT_TYPES[b].cost)[0];
    };

    const needsFrontline = queuedRoles.frontline < 1;
    const needsSupport = queuedRoles.support < 1;

    if (needsFrontline) {
      const id = pickOffer("frontline");
      if (id && this.queueUnit({ id, fromShop: true }, SIDE.AI)) return;
    }

    if (needsSupport) {
      const id = pickOffer("support");
      if (id && this.queueUnit({ id, fromShop: true }, SIDE.AI)) return;
    }

    const disruptor = pickOffer("disruptor");
    if (disruptor && this.queueUnit({ id: disruptor, fromShop: true }, SIDE.AI)) return;

    const damage = pickOffer("damage");
    if (damage && this.queueUnit({ id: damage, fromShop: true }, SIDE.AI)) return;

    const fallback = pickAffordable();
    if (fallback) {
      this.queueUnit({ id: fallback, fromShop: true }, SIDE.AI);
      return;
    }

    const rerollCost = this.getRerollCost(SIDE.AI);
    if (this.aiResources >= rerollCost + 2) {
      this.requestShopReroll(SIDE.AI);
    }
  }
}
