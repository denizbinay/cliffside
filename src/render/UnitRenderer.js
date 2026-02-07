/**
 * UnitRenderer - Handles all Phaser rendering for a single unit.
 * Extracted from the old Unit.js class.
 */

import { UNIT_ANIMATION_PROFILES } from "../data/unitAnimationProfiles.js";
import { SIDE, COMBAT_CONFIG } from "../config/GameConfig.js";
import { isUnitAlive } from "../entities/UnitData.js";

export default class UnitRenderer {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {Object} unit - UnitData object
   * @param {GameContext} ctx - Game context
   */
  constructor(scene, unit, ctx) {
    this.scene = scene;
    this.ctx = ctx;
    this.unitId = unit.id;
    this.side = unit.side;

    // Visual state
    this.baseColor = unit.color;
    this.size = unit.size;

    // Animation state
    this.animatedProfile = this.resolveAnimatedProfile(unit.type);
    this.currentAnim = "";
    this.animLocked = false;
    this.actionAnimLockedUntil = 0;
    this.actionAnimLockedKey = "";

    // Create container
    this.body = scene.add.container(unit.x, unit.y);
    this.body.setDepth(4);

    // Create main visual
    if (this.animatedProfile) {
      this.createAnimatedSprite(unit);
    } else {
      this.createShapeSprite(unit);
    }

    // Create status dots
    this.statusDots = this.buildStatusDots();
    this.body.add(this.statusDots);

    // Create health bar
    this.healthBarOffsetY = Number.isFinite(this.animatedProfile?.healthBarOffsetY)
      ? this.animatedProfile.healthBarOffsetY
      : -30;
    this.healthBar = scene.add.rectangle(unit.x, unit.y + this.healthBarOffsetY, this.size, 5, 0x2d2f38);
    this.healthFill = scene.add.rectangle(unit.x, unit.y + this.healthBarOffsetY, this.size, 5, 0x76c27a);
    this.healthBar.setDepth(4);
    this.healthFill.setDepth(4);

    // Play initial animation
    this.playAnimation("idle", true);
  }

  createAnimatedSprite(unit) {
    const profile = this.animatedProfile;
    const sizeScale = profile.sizeScale || 2;
    const widthScale = profile.widthScale || 1;
    const heightScale = profile.heightScale || 1;

    this.mainShape = this.scene.add.sprite(0, 0, profile.textureKey, 0);
    this.mainShape.setDisplaySize(this.size * sizeScale * widthScale, this.size * sizeScale * heightScale);
    this.mainShape.setOrigin(profile.originX ?? 0.5, profile.originY ?? 0.7);
    this.mainShape.setFlipX(unit.side === SIDE.AI);
    this.body.add(this.mainShape);
  }

  createShapeSprite(unit) {
    const shapeData = this.buildShape(unit.type, unit.color);
    this.mainShape = shapeData.main;
    this.body.add([shapeData.main, ...shapeData.extras]);
  }

  resolveAnimatedProfile(unitType) {
    const profile = UNIT_ANIMATION_PROFILES[unitType];
    if (!profile?.textureKey) return null;
    if (!this.scene.textures.exists(profile.textureKey)) return null;
    return profile;
  }

  // --- Shape Building (for units without sprites) ---

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
    group.statusRefs = { stun, slow, buff };
    return group;
  }

  // --- Animation ---

  resolveAnimAction(action) {
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

  playAnimation(action, force = false) {
    if (!this.animatedProfile || !this.mainShape?.anims) return null;
    if (this.animLocked && !force && action !== "death") return null;
    if (!force && action !== "death" && this.scene.time.now < this.actionAnimLockedUntil) return null;

    const resolved = this.resolveAnimAction(action);
    if (!resolved?.key) return null;

    if (!force && this.currentAnim === resolved.key) return resolved;

    if (resolved.lock) this.animLocked = true;

    this.currentAnim = resolved.key;
    this.mainShape.play(resolved.key, !force);
    this.lockTransientAnim(resolved);
    return resolved;
  }

  lockTransientAnim(resolved) {
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

  playDeathAnimation() {
    this.healthBar.setVisible(false);
    this.healthFill.setVisible(false);

    const resolved = this.playAnimation("death", true);
    if (!resolved?.key) return;

    const anim = this.scene.anims.get(resolved.key);
    if (!anim) return;

    this.mainShape.once(`animationcomplete-${resolved.key}`, () => {
      // Death animation complete - entity will be cleaned up by EntityManager
    });
  }

  // --- Visual Effects ---

  flash(color) {
    if (this.mainShape?.setFillStyle) {
      this.mainShape.setFillStyle(color);
    } else if (this.mainShape?.setTintFill) {
      this.mainShape.setTintFill(color);
    }
    this.scene.time.delayedCall(COMBAT_CONFIG.flashDuration, () => {
      if (this.mainShape?.setFillStyle) {
        this.mainShape.setFillStyle(this.baseColor);
      } else if (this.mainShape?.clearTint) {
        this.mainShape.clearTint();
      }
    });
  }

  // --- Sync with Data ---

  sync(unit) {
    if (!unit) return;

    // Sync position
    this.body.x = unit.x;
    this.body.y = unit.y;

    // Sync health bar position
    this.healthBar.x = unit.x;
    this.healthFill.x = unit.x;
    this.healthBar.y = unit.y + this.healthBarOffsetY;
    this.healthFill.y = unit.y + this.healthBarOffsetY;

    // Sync health bar fill
    const ratio = unit.hp / unit.maxHp;
    this.healthFill.width = this.healthBar.width * ratio;
    this.healthFill.x = this.healthBar.x - (this.healthBar.width - this.healthFill.width) / 2;
    this.healthFill.setVisible(ratio > 0.02 && isUnitAlive(unit));

    // Hide health bar if dead
    if (!isUnitAlive(unit)) {
      this.healthBar.setVisible(false);
      this.healthFill.setVisible(false);
    }

    // Sync status dots
    this.statusDots.x = 0;
    this.statusDots.y = -this.size * 0.85;
    this.updateStatusDots(unit);

    // Determine action for animation (if not locked)
    if (isUnitAlive(unit) && this.scene.time.now >= this.actionAnimLockedUntil) {
      // This is a simplified version - full logic would check if unit is attacking/moving
      // For now, just ensure idle is playing when not in combat
    }
  }

  updateStatusDots(unit) {
    const any = unit.status.stun > 0 || unit.status.slow > 0 || unit.status.buff > 0;
    this.statusDots.setVisible(any);
    if (!any) return;
    this.statusDots.statusRefs.stun.setVisible(unit.status.stun > 0);
    this.statusDots.statusRefs.slow.setVisible(unit.status.slow > 0);
    this.statusDots.statusRefs.buff.setVisible(unit.status.buff > 0);
  }

  // --- Cleanup ---

  destroy() {
    this.body.destroy();
    this.healthBar.destroy();
    this.healthFill.destroy();
  }
}
