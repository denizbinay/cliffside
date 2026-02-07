/**
 * EffectsRenderer - Handles visual effects (spawn pulses, callouts, flashes, ability visuals).
 * Subscribes to effect events from EventBus.
 */

import { SIDE, COMBAT_CONFIG } from "../config/GameConfig.js";

export default class EffectsRenderer {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {GameContext} ctx - Game context
   */
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;
  }

  /**
   * Create a spawn pulse effect.
   * @param {Object} data - { x, y, color }
   */
  spawnPulse(data) {
    const { x, y, color } = data;
    const ring = this.scene.add.circle(x, y, 10, color, 0.4);

    this.scene.tweens.add({
      targets: ring,
      radius: COMBAT_CONFIG.spawnPulseRadius,
      alpha: 0,
      duration: COMBAT_CONFIG.spawnPulseDuration,
      onComplete: () => ring.destroy()
    });
  }

  /**
   * Create a text callout effect.
   * @param {Object} data - { x, y, text, side }
   */
  spawnCallout(data) {
    const { x, y, text, side } = data;
    const label = this.scene.add.text(x, y, text, {
      fontFamily: "Cinzel",
      fontSize: "14px",
      color: side === SIDE.PLAYER ? "#e7e2d8" : "#f4d2c4"
    });
    label.setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: label,
      y: y - COMBAT_CONFIG.calloutRiseDistance,
      alpha: 0,
      duration: COMBAT_CONFIG.calloutDuration,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy()
    });
  }

  /**
   * Flash effect for a specific object.
   * @param {Object} data - { target, color, duration }
   */
  flash(data) {
    const { target, color, duration = COMBAT_CONFIG.flashDuration } = data;
    if (!target) return;

    const originalColor = target._originalColor;

    if (target.setFillStyle) {
      if (!originalColor) target._originalColor = target.fillColor;
      target.setFillStyle(color);
    } else if (target.setTintFill) {
      target.setTintFill(color);
    }

    this.scene.time.delayedCall(duration, () => {
      if (target.setFillStyle && originalColor !== undefined) {
        target.setFillStyle(originalColor);
      } else if (target.clearTint) {
        target.clearTint();
      }
    });
  }

  /**
   * Ability visual effect.
   * @param {Object} data - { type, x, y, radius, color, label, ... }
   */
  abilityVisual(data) {
    const { type } = data;

    switch (type) {
      case "healWave":
        this.healWaveVisual(data);
        break;
      case "pulse":
        this.pulseVisual(data);
        break;
      case "controlPointCapture":
        this.controlPointCaptureVisual(data);
        break;
    }
  }

  healWaveVisual(data) {
    const { x, y, radius = 400 } = data;

    const wave = this.scene.add.circle(x, y, 20, 0x9fd6aa, 0.5);
    this.scene.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: 500,
      onComplete: () => wave.destroy()
    });

    const label = this.scene.add.text(x, y - 90, "Heal Wave", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#dff1da"
    });
    label.setOrigin(0.5, 0.5);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });
  }

  pulseVisual(data) {
    const { x, y, radius = 200 } = data;

    const pulse = this.scene.add.circle(x, y, 30, 0xffd58a, 0.4);
    this.scene.tweens.add({
      targets: pulse,
      radius,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy()
    });

    const label = this.scene.add.text(x, y - 90, "Defensive Pulse", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#f2ddae"
    });
    label.setOrigin(0.5, 0.5);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });
  }

  controlPointCaptureVisual(data) {
    const { x, y, owner } = data;

    const color = owner === SIDE.PLAYER ? 0x6fa3d4 : owner === SIDE.AI ? 0xb36a6a : 0x3a3f4f;
    const ring = this.scene.add.circle(x, y, 8, color, 0.8);

    this.scene.tweens.add({
      targets: ring,
      radius: 24,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy()
    });
  }

  // --- Cleanup ---

  destroy() {
    // No persistent state to clean up
  }
}
