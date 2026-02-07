/**
 * TurretRenderer - Handles all Phaser rendering for a turret.
 * Extracted from the old Turret.js class.
 */

import { SIDE, TURRET_CONFIG } from "../config/GameConfig.js";
import { isTurretAlive, getTurretHpRatio } from "../entities/TurretData.js";

export default class TurretRenderer {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} turret - TurretData object
   * @param {GameContext} ctx - Game context
   */
  constructor(scene, turret, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this.turretId = turret.id;
    this.side = turret.side;
    this.x = turret.x;
    this.y = turret.y;

    const metrics = turret.metrics || {};

    // Create container
    this.body = scene.add.container(turret.x, turret.y);
    this.body.setDepth(3);

    // Check for textures
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

    this.base = null;
    this.baseIsSprite = false;
    this.baseTeamTint = turret.side === SIDE.PLAYER ? 0xb5cee6 : 0xe1bbbb;

    // Create base
    if (showBase && hasTurretBase) {
      const base = scene.add.image(0, 0, "turret_base").setDisplaySize(baseWidth, baseHeight);
      base.setTint(this.baseTeamTint);
      this.body.add(base);
      this.base = base;
      this.baseIsSprite = true;
    } else if (showBase) {
      const base = scene
        .add.rectangle(0, 0, 36, 26, turret.side === SIDE.PLAYER ? 0x5a6b7a : 0x7a5a5a)
        .setStrokeStyle(2, 0x1c1f27, 1);
      const tower = scene.add.rectangle(0, -16, 24, 22, 0x2b303b).setStrokeStyle(2, 0x1c1f27, 1);
      this.body.add([base, tower]);
      this.base = base;
      this.baseIsSprite = false;
    }

    // Create head
    const headY = showBase ? -24 : -headHeight * 0.5;
    if (hasTurretHead) {
      const head = scene.add.image(0, headY, turretHeadKey).setDisplaySize(headWidth, headHeight);
      head.setFlipX(turret.side === SIDE.AI);
      this.body.add(head);
    } else {
      const head = scene
        .add.triangle(0, headY - 6, -8, 6, 8, 6, 0, -6, 0xe2d2b3)
        .setStrokeStyle(1, 0x1c1f27, 1);
      this.body.add(head);
    }

    // Health bar
    const healthBarWidth = metrics.hpWidth || 44;
    const healthBarHeight = metrics.hpHeight || 5;
    const turretTopY = Math.min(showBase ? -baseHeight * 0.5 : Number.POSITIVE_INFINITY, headY - headHeight * 0.5);
    this.healthBarOffsetX = metrics.hpOffsetX || 0;
    this.healthBarOffsetY = Number.isFinite(metrics.hpOffsetY) ? metrics.hpOffsetY : turretTopY - healthBarHeight * 1.4;

    this.healthBar = scene.add.rectangle(
      turret.x + this.healthBarOffsetX,
      turret.y + this.healthBarOffsetY,
      healthBarWidth,
      healthBarHeight,
      0x2d2f38
    );
    this.healthFill = scene.add.rectangle(
      turret.x + this.healthBarOffsetX,
      turret.y + this.healthBarOffsetY,
      healthBarWidth,
      Math.max(2, healthBarHeight - 1),
      0x9ec9f0
    );
    this.healthBar.setDepth(4);
    this.healthFill.setDepth(4);
  }

  // --- Visual Effects ---

  fireArrow(targetX, targetY) {
    const arrow = this.scene.add.rectangle(
      this.x,
      this.y - 22,
      TURRET_CONFIG.arrowSize.width,
      TURRET_CONFIG.arrowSize.height,
      0xf3ead7
    );
    arrow.setRotation(Math.atan2(targetY - this.y, targetX - this.x));

    this.scene.tweens.add({
      targets: arrow,
      x: targetX,
      y: targetY,
      alpha: 0.2,
      duration: TURRET_CONFIG.arrowDuration,
      onComplete: () => arrow.destroy()
    });
  }

  flash(color) {
    if (!this.base) return;

    if (this.baseIsSprite) {
      this.base.setTintFill(color);
    } else {
      this.base.setFillStyle(color);
    }

    this.scene.time.delayedCall(TURRET_CONFIG.flashDuration, () => {
      if (this.baseIsSprite) {
        this.base.setTint(this.baseTeamTint);
      } else {
        this.base.setFillStyle(this.side === SIDE.PLAYER ? 0x5a6b7a : 0x7a5a5a);
      }
    });
  }

  // --- Sync with Data ---

  sync(turret) {
    if (!turret) return;

    // Update position references
    this.x = turret.x;
    this.y = turret.y;

    // Sync health bar
    this.healthBar.x = turret.x + this.healthBarOffsetX;
    this.healthFill.x = turret.x + this.healthBarOffsetX;
    this.healthBar.y = turret.y + this.healthBarOffsetY;
    this.healthFill.y = turret.y + this.healthBarOffsetY;

    const ratio = getTurretHpRatio(turret);
    this.healthFill.width = this.healthBar.width * ratio;
    this.healthFill.x = this.healthBar.x - (this.healthBar.width - this.healthFill.width) / 2;

    // Hide if destroyed
    if (!isTurretAlive(turret)) {
      this.body.setVisible(false);
      this.healthBar.setVisible(false);
      this.healthFill.setVisible(false);
    }
  }

  // --- Cleanup ---

  destroy() {
    this.body.destroy();
    this.healthBar.destroy();
    this.healthFill.destroy();
  }
}
