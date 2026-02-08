import { defineComponent, Types } from "bitecs";

/**
 * Collision component for 1D lane blocking.
 *
 * Units are blocked by enemies in front of them, creating a natural battle line.
 * - Allies pass through each other freely
 * - Ghost units (TARGET_FLAG.GHOST) pass through enemies
 * - Units with MOVE_FLAG.PASS_THROUGH ignore collision temporarily
 */
export const Collision = defineComponent({
  /** Entity ID blocking this unit's movement (0 = not blocked) */
  blockedBy: Types.eid,
  /** Radius for collision detection (typically UnitConfig.size / 2) */
  radius: Types.f32
});
