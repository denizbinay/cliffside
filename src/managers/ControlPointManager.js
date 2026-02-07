/**
 * ControlPointManager - Handles control point logic and state.
 * Moved from GameScene to separate concerns.
 */

import Phaser from "phaser";
import { SIDE, CONTROL_POINT_CONFIG } from "../config/GameConfig.js";
import { GameEvents } from "../core/EventBus.js";
import { updateControlPoint, isInControlZone } from "../entities/ControlPointData.js";

export default class ControlPointManager {
  /**
   * @param {GameContext} ctx - Game context
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.state = ctx.state;
    this.events = ctx.events;

    this.checkTimer = 0;
  }

  /**
   * Initialize control points from level manager configs.
   * @param {Object[]} configs - Control point configurations
   */
  initialize(configs) {
    const entityManager = this.ctx.getManager("entity");
    if (entityManager) {
      entityManager.createControlPoints(configs);
    }
  }

  /**
   * Update control points - called each frame.
   * @param {number} delta - Delta time in seconds
   */
  update(delta) {
    if (this.state.isGameOver) return;

    this.checkTimer += delta;

    if (this.checkTimer >= CONTROL_POINT_CONFIG.checkInterval) {
      this.checkTimer = 0;
      this.evaluateControlPoints();
    }
  }

  /**
   * Evaluate all control points for ownership changes.
   */
  evaluateControlPoints() {
    const controlPoints = this.state.getControlPoints();
    const playerUnits = this.state.getAliveUnits(SIDE.PLAYER);
    const aiUnits = this.state.getAliveUnits(SIDE.AI);

    let playerCount = 0;
    let aiCount = 0;

    for (const point of controlPoints) {
      // Calculate presence in this point's zone
      let playerPresence = 0;
      let aiPresence = 0;

      for (const unit of playerUnits) {
        if (isInControlZone(point, unit.x, unit.y)) {
          playerPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }

      for (const unit of aiUnits) {
        if (isInControlZone(point, unit.x, unit.y)) {
          aiPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }

      // Update point ownership
      const result = updateControlPoint(point, playerPresence, aiPresence);

      if (result.ownerChanged) {
        this.events.emit(GameEvents.CONTROL_POINT_UPDATED, {
          point,
          prevOwner: result.prevOwner,
          newOwner: result.newOwner
        });

        this.events.emit(GameEvents.LOG, {
          type: "point",
          index: point.index,
          owner: point.owner
        });
      }

      // Count owned points
      if (point.owner === SIDE.PLAYER) playerCount += 1;
      if (point.owner === SIDE.AI) aiCount += 1;
    }

    // Determine overall zone owner
    let newOwner = "neutral";
    if (playerCount > aiCount) newOwner = SIDE.PLAYER;
    if (aiCount > playerCount) newOwner = SIDE.AI;

    if (newOwner !== this.state.zoneOwner) {
      const prevOwner = this.state.zoneOwner;
      this.state.zoneOwner = newOwner;

      this.events.emit(GameEvents.ZONE_OWNER_CHANGED, {
        prevOwner,
        newOwner
      });

      this.events.emit(GameEvents.LOG, {
        type: "zone",
        owner: this.state.zoneOwner
      });
    }
  }

  /**
   * Update control point visuals (called by LevelManager or RenderSystem).
   * @param {Object} levelManager - LevelManager instance
   */
  syncVisuals(levelManager) {
    if (!levelManager?.controlPointVisuals) return;

    const controlPoints = this.state.getControlPoints();

    for (const point of controlPoints) {
      const visual = levelManager.controlPointVisuals[point.index];
      if (!visual) continue;

      const tint = point.owner === SIDE.PLAYER ? 0x6fa3d4 : point.owner === SIDE.AI ? 0xb36a6a : 0x3a3f4f;
      visual.marker.setFillStyle(tint, 0.65);

      const coreTint = point.owner === SIDE.PLAYER ? 0x9ec9f0 : point.owner === SIDE.AI ? 0xf0b5b5 : 0x7b8598;
      visual.core.setFillStyle(coreTint, 0.9);

      if (visual.rune) {
        visual.rune.setTint(coreTint);
        visual.rune.setAlpha(0.8);
      }

      if (visual.glow) {
        visual.glow.setTint(tint);
        visual.glow.setAlpha(point.owner === "neutral" ? 0.35 : 0.6);
      }
    }
  }
}
