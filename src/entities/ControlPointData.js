/**
 * ControlPointData - Pure data representation of a control point.
 * No Phaser imports. All rendering is handled by LevelManager/ControlPointManager.
 */

import { CONTROL_POINT_CONFIG, SIDE } from "../config/GameConfig.js";

/**
 * Factory function to create a control point data object.
 * @param {Object} options - Control point configuration
 * @returns {Object} ControlPointData object
 */
export function createControlPointData(options) {
  const {
    index,
    x,
    y,
    zoneWidth = CONTROL_POINT_CONFIG.zoneWidth || 120,
    zoneHeight = CONTROL_POINT_CONFIG.zoneHeight || 52
  } = options;

  return {
    // Identity
    index,
    entityType: "controlPoint",

    // Position
    x,
    y,

    // State
    owner: "neutral",
    progress: 0,

    // Zone bounds (for presence checking)
    zone: {
      x: x - zoneWidth / 2,
      y: y - zoneHeight / 2,
      width: zoneWidth,
      height: zoneHeight
    },

    // Dirty flags
    dirty: true
  };
}

/**
 * Check if a position is within a control point's zone.
 * @param {Object} point - ControlPointData object
 * @param {number} x - X position to check
 * @param {number} y - Y position to check
 * @returns {boolean}
 */
export function isInControlZone(point, x, y) {
  const zone = point.zone;
  return (
    x >= zone.x &&
    x <= zone.x + zone.width &&
    y >= zone.y &&
    y <= zone.y + zone.height
  );
}

/**
 * Update control point based on presence.
 * @param {Object} point - ControlPointData object
 * @param {number} playerPresence - Total player presence in zone
 * @param {number} aiPresence - Total AI presence in zone
 * @returns {Object} Result with ownerChanged flag
 */
export function updateControlPoint(point, playerPresence, aiPresence) {
  const diff = playerPresence - aiPresence;
  const prevOwner = point.owner;

  // Update progress
  if (Math.abs(diff) <= CONTROL_POINT_CONFIG.contestDeadzone) {
    // Contested or empty - decay toward neutral
    point.progress *= CONTROL_POINT_CONFIG.decayRate;
  } else {
    // One side has advantage
    point.progress = Math.max(
      -1,
      Math.min(1, point.progress + diff * CONTROL_POINT_CONFIG.progressRate)
    );
  }

  // Determine owner
  if (point.progress >= CONTROL_POINT_CONFIG.ownershipThreshold) {
    point.owner = SIDE.PLAYER;
  } else if (point.progress <= -CONTROL_POINT_CONFIG.ownershipThreshold) {
    point.owner = SIDE.AI;
  } else {
    point.owner = "neutral";
  }

  const ownerChanged = point.owner !== prevOwner;
  if (ownerChanged) {
    point.dirty = true;
  }

  return { ownerChanged, prevOwner, newOwner: point.owner };
}

/**
 * Clear dirty flags after render sync.
 * @param {Object} point - ControlPointData object
 */
export function clearControlPointDirtyFlags(point) {
  point.dirty = false;
}
