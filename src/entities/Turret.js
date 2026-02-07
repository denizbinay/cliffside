import { SIDE, TURRET_CONFIG } from "../config/GameConfig.js";

export default class Turret {
  constructor(scene, side, x, y, metrics = {}) {
    this.scene = scene;
    this.side = side;
    this.x = x;
    this.y = y;
    this.maxHp = TURRET_CONFIG.maxHp;
    this.hp = TURRET_CONFIG.maxHp;
    this.range = TURRET_CONFIG.range;
    this.dmg = TURRET_CONFIG.damage;
    this.attackRate = TURRET_CONFIG.attackRate;
    this.attackCooldown = 0;
    this.status = { stun: 0 };
    this.earlyWaveShieldWaves = TURRET_CONFIG.earlyWaveShieldWaves;
    this.earlyWaveDamageMult = TURRET_CONFIG.earlyWaveDamageMult;
    this.earlyWaveMinHpRatio = TURRET_CONFIG.earlyWaveMinHpRatio;
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
    const arrow = this.scene.add.rectangle(
      this.x, this.y - 22,
      TURRET_CONFIG.arrowSize.width,
      TURRET_CONFIG.arrowSize.height,
      0xf3ead7
    );
    arrow.setRotation(Math.atan2(ty - this.y, tx - this.x));
    this.scene.tweens.add({
      targets: arrow,
      x: tx,
      y: ty,
      alpha: 0.2,
      duration: TURRET_CONFIG.arrowDuration,
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
    this.scene.time.delayedCall(TURRET_CONFIG.flashDuration, () => {
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
