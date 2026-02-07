import Phaser from "phaser";
import { SIDE, CASTLE_CONFIG } from "../config/GameConfig.js";

export default class Castle {
  constructor(scene, x, y, side, color, layoutProfile, getCastleVariant) {
    this.scene = scene;
    this.side = side;
    this.x = x;
    this.y = y;
    this.maxHp = CASTLE_CONFIG.maxHp;
    this.hp = CASTLE_CONFIG.maxHp;
    this.color = color;

    const castleVariant = getCastleVariant();
    const castleKey = castleVariant.useTwinMirror
      ? castleVariant.baseKey
      : side === SIDE.PLAYER
      ? "castle_base_player"
      : "castle_base_ai";
    const hasCastleBase = scene.textures.exists(castleKey);

    const castleBaseCenterYOffset = layoutProfile.castle.baseCenterYOffset;
    const castleBaseWidth = layoutProfile.castle.baseWidth;
    const castleBaseHeight = layoutProfile.castle.baseHeight;
    const castleHpBarWidth = layoutProfile.castle.hpWidth;
    const castleHpBarHeight = layoutProfile.castle.hpHeight;
    const castleHpOffsetX = layoutProfile.castle.hpOffsetX;
    const castleHpOffsetY = layoutProfile.castle.hpOffsetY;

    if (hasCastleBase) {
      this.base = scene.add
        .image(x, y + castleBaseCenterYOffset, castleKey)
        .setDisplaySize(castleBaseWidth, castleBaseHeight)
        .setDepth(6);
      this.base.setFlipX(side === SIDE.PLAYER);
    } else {
      this.base = scene.add.rectangle(x, y, 92, 120, color).setStrokeStyle(3, 0x20242f, 1).setDepth(6);
      scene.add.rectangle(x, y + 22, 36, 48, 0x2a211e).setStrokeStyle(2, 0x161414, 1).setDepth(7);
      scene.add.triangle(x, y - 90, -36, 20, 36, 20, 0, -20, 0x2a2f3a).setStrokeStyle(2, 0x1b1e27, 1).setDepth(7);
    }

    const hpBarX = x + (side === SIDE.PLAYER ? castleHpOffsetX : -castleHpOffsetX);
    const hpBarY = y + castleHpOffsetY;
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

    this.baseTeamTint = side === SIDE.PLAYER ? 0xb5cee6 : 0xe1bbbb;
    this.baseIsSprite = hasCastleBase;
    this.hpBarWidth = castleHpBarWidth;

    if (hasCastleBase) this.base.setTint(this.baseTeamTint);

    this.tower = null;
    this.banner = null;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.baseIsSprite) {
      this.base.setTintFill(CASTLE_CONFIG.hitFlashColor);
      this.scene.time.delayedCall(CASTLE_CONFIG.hitFlashDuration, () => this.base.setTint(this.baseTeamTint));
    } else {
      this.base.setFillStyle(CASTLE_CONFIG.hitFlashColor);
      this.scene.time.delayedCall(CASTLE_CONFIG.hitFlashDuration, () => this.base.setFillStyle(this.color));
    }
    this.scene.cameras.main.shake(CASTLE_CONFIG.shakeDuration, CASTLE_CONFIG.shakeIntensity);
  }

  updateHud() {
    if (!this.hpBarFill || !this.hpBarWidth) return;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBarFill.width = this.hpBarWidth * ratio;
    const fillColor = ratio > 0.65 ? 0x79d27e : ratio > 0.35 ? 0xf0be64 : 0xd96c6c;
    this.hpBarFill.setFillStyle(fillColor, 1);
    this.hpBarFill.setVisible(ratio > 0.01);
  }

  destroy() {
    this.base?.destroy();
    this.tower?.destroy();
    this.banner?.destroy();
    this.hpBarFrame?.destroy();
    this.hpBarBack?.destroy();
    this.hpBarFill?.destroy();
  }
}
