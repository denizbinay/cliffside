/**
 * CastleRenderer - Handles all Phaser rendering for a castle.
 * Extracted from the old Castle.js class.
 */

import Phaser from "phaser";
import { SIDE, CASTLE_CONFIG } from "../config/GameConfig.js";
import { isCastleAlive, getCastleHpRatio } from "../entities/CastleData.js";

export default class CastleRenderer {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} castle - CastleData object
   * @param {GameContext} ctx - Game context
   */
  constructor(scene, castle, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this.castleId = castle.id;
    this.side = castle.side;
    this.x = castle.x;
    this.y = castle.y;
    this.color = castle.color;

    // Get layout profile from context or use defaults
    const levelManager = ctx.managers.level;
    const layoutProfile = levelManager?.layoutProfile || this.getDefaultLayoutProfile();

    const castleVariant = levelManager?.getCastleVariant?.() || { useTwinMirror: false };
    const castleKey = castleVariant.useTwinMirror
      ? castleVariant.baseKey
      : castle.side === SIDE.PLAYER
        ? "castle_base_player"
        : "castle_base_ai";
    const hasCastleBase = scene.textures.exists(castleKey);

    const castleBaseCenterYOffset = layoutProfile.castle?.baseCenterYOffset || 28;
    const castleBaseWidth = layoutProfile.castle?.baseWidth || 132;
    const castleBaseHeight = layoutProfile.castle?.baseHeight || 176;
    const castleHpBarWidth = layoutProfile.castle?.hpWidth || 220;
    const castleHpBarHeight = layoutProfile.castle?.hpHeight || 20;
    const castleHpOffsetX = layoutProfile.castle?.hpOffsetX || 0;
    const castleHpOffsetY = layoutProfile.castle?.hpOffsetY || -118;

    // Create base visual
    if (hasCastleBase) {
      this.base = scene.add
        .image(castle.x, castle.y + castleBaseCenterYOffset, castleKey)
        .setDisplaySize(castleBaseWidth, castleBaseHeight)
        .setDepth(6);
      this.base.setFlipX(castle.side === SIDE.PLAYER);
      this.baseIsSprite = true;
    } else {
      this.base = scene.add.rectangle(castle.x, castle.y, 92, 120, castle.color).setStrokeStyle(3, 0x20242f, 1).setDepth(6);
      scene.add.rectangle(castle.x, castle.y + 22, 36, 48, 0x2a211e).setStrokeStyle(2, 0x161414, 1).setDepth(7);
      scene.add.triangle(castle.x, castle.y - 90, -36, 20, 36, 20, 0, -20, 0x2a2f3a).setStrokeStyle(2, 0x1b1e27, 1).setDepth(7);
      this.baseIsSprite = false;
    }

    // Team tint
    this.baseTeamTint = castle.side === SIDE.PLAYER ? 0xb5cee6 : 0xe1bbbb;
    if (this.baseIsSprite) {
      this.base.setTint(this.baseTeamTint);
    }

    // Create HP bar
    const hpBarX = castle.x + (castle.side === SIDE.PLAYER ? castleHpOffsetX : -castleHpOffsetX);
    const hpBarY = castle.y + castleHpOffsetY;
    const hpFramePadding = 2;

    this.hpBarFrame = scene.add
      .rectangle(hpBarX, hpBarY, castleHpBarWidth + hpFramePadding * 2, castleHpBarHeight + hpFramePadding * 2, 0x10151f, 0.92)
      .setStrokeStyle(1, 0xe4d6b8, 0.9)
      .setDepth(9);
    this.hpBarBack = scene.add.rectangle(hpBarX, hpBarY, castleHpBarWidth, castleHpBarHeight, 0x252d3a, 1).setDepth(10);
    this.hpBarFill = scene.add
      .rectangle(hpBarX - castleHpBarWidth * 0.5, hpBarY, castleHpBarWidth, castleHpBarHeight - 4, 0x79d27e)
      .setOrigin(0, 0.5)
      .setDepth(11);

    this.hpBarWidth = castleHpBarWidth;

    // Tower and banner (optional, created by LevelManager if needed)
    this.tower = null;
    this.banner = null;
  }

  getDefaultLayoutProfile() {
    return {
      castle: {
        baseCenterYOffset: 28,
        baseWidth: 132,
        baseHeight: 176,
        hpWidth: 220,
        hpHeight: 20,
        hpOffsetX: 0,
        hpOffsetY: -118
      }
    };
  }

  // --- Visual Effects ---

  flashDamage() {
    if (this.baseIsSprite) {
      this.base.setTintFill(CASTLE_CONFIG.hitFlashColor);
      this.scene.time.delayedCall(CASTLE_CONFIG.hitFlashDuration, () => {
        this.base.setTint(this.baseTeamTint);
      });
    } else {
      this.base.setFillStyle(CASTLE_CONFIG.hitFlashColor);
      this.scene.time.delayedCall(CASTLE_CONFIG.hitFlashDuration, () => {
        this.base.setFillStyle(this.color);
      });
    }
  }

  shake() {
    this.scene.cameras.main.shake(CASTLE_CONFIG.shakeDuration, CASTLE_CONFIG.shakeIntensity);
  }

  // --- Sync with Data ---

  sync(castle) {
    if (!castle) return;

    // Update HP bar
    const ratio = getCastleHpRatio(castle);
    this.hpBarFill.width = this.hpBarWidth * ratio;

    // Color based on HP
    const fillColor = ratio > 0.65 ? 0x79d27e : ratio > 0.35 ? 0xf0be64 : 0xd96c6c;
    this.hpBarFill.setFillStyle(fillColor, 1);
    this.hpBarFill.setVisible(ratio > 0.01);
  }

  // --- Cleanup ---

  destroy() {
    this.base?.destroy();
    this.tower?.destroy();
    this.banner?.destroy();
    this.hpBarFrame?.destroy();
    this.hpBarBack?.destroy();
    this.hpBarFill?.destroy();
  }
}
