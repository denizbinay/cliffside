import { defineQuery } from "bitecs";
import { Collision, EntityType, Faction, FACTION, Health, Position } from "../components";
import { ENTITY_TYPE } from "../constants";
import { SpatialHash1D } from "../spatial/SpatialHash";
import { targetingStore, TARGET_FLAG } from "../../sim/Targeting";
import { movementStore, MOVE_FLAG } from "../../sim/Movement";
import type { GameWorld } from "../world";

/**
 * Collision System for 1D lane blocking.
 *
 * Populates `Collision.blockedBy` for each unit based on:
 * - Enemy units in front (based on movement direction)
 * - Collision radius overlap
 *
 * Respects:
 * - TARGET_FLAG.GHOST: Ghost units pass through and don't block
 * - MOVE_FLAG.PASS_THROUGH: Units with this flag ignore collision
 *
 * Does NOT block:
 * - Allied units (they pass through each other freely)
 */

const collidables = defineQuery([Position, Health, Faction, EntityType, Collision]);

/** Maximum collision radius for search queries */
const MAX_COLLISION_RADIUS = 40;

export function createCollisionSystem(): (world: GameWorld) => GameWorld {
  const spatial = new SpatialHash1D(100);

  return function collisionSystem(world: GameWorld): GameWorld {
    const entities = collidables(world);

    // Build spatial hash of all alive units
    spatial.clear();
    for (const eid of entities) {
      if ((EntityType.value[eid] & ENTITY_TYPE.UNIT) === 0) continue;
      if (Health.current[eid] <= 0) continue;
      spatial.insert(eid, Position.x[eid]);
    }

    // Check collisions for each unit
    for (const eid of entities) {
      if ((EntityType.value[eid] & ENTITY_TYPE.UNIT) === 0) continue;
      if (Health.current[eid] <= 0) continue;

      // Reset blocked state each tick
      Collision.blockedBy[eid] = 0;

      // Check if this unit ignores collision (PASS_THROUGH flag)
      const moveIntent = movementStore.getIntent(eid);
      if (moveIntent && moveIntent.flags & MOVE_FLAG.PASS_THROUGH) continue;

      // Ghost units pass through everything
      if (targetingStore.hasFlag(eid, TARGET_FLAG.GHOST)) continue;

      const myX = Position.x[eid];
      const myFaction = Faction.value[eid];
      const myRadius = Collision.radius[eid];

      // Determine movement direction (toward enemy castle)
      // Player faction moves right (+1), AI moves left (-1)
      const moveDir = myFaction === FACTION.PLAYER ? 1 : -1;

      let closestBlocker = 0;
      let closestDist = Infinity;

      // Query nearby entities
      const searchRadius = myRadius + MAX_COLLISION_RADIUS;

      for (const otherEid of spatial.queryRadius(myX, searchRadius)) {
        if (otherEid === eid) continue;
        if (Health.current[otherEid] <= 0) continue;

        // Only enemies block (no ally collision)
        if (Faction.value[otherEid] === myFaction) continue;

        // Ghost units don't block others
        if (targetingStore.hasFlag(otherEid, TARGET_FLAG.GHOST)) continue;

        const otherX = Position.x[otherEid];
        const otherRadius = Collision.radius[otherEid];

        // Is this enemy in front of us (in our movement direction)?
        const dx = otherX - myX;
        if (moveDir === 1 && dx <= 0) continue; // Moving right, enemy must be to our right
        if (moveDir === -1 && dx >= 0) continue; // Moving left, enemy must be to our left

        // Check if radii overlap
        const combinedRadius = myRadius + otherRadius;
        const distance = Math.abs(dx);

        if (distance >= combinedRadius) continue; // Not overlapping

        // Track closest blocker
        if (distance < closestDist) {
          closestDist = distance;
          closestBlocker = otherEid;
        }
      }

      Collision.blockedBy[eid] = closestBlocker;
    }

    return world;
  };
}
