/**
 * DisplacementSystem - handles knockbacks, pulls, dashes.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { Position } from "../components/Position";
import { movementStore, tickMovement, isDisplaced, MOVE_TYPE } from "../../sim/Movement";
import type { GameWorld } from "../world";

const movableEntities = defineQuery([Health, Position]);

export function createDisplacementSystem(): (world: GameWorld) => GameWorld {
  return function displacementSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = movableEntities(world);

    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;

      const intent = movementStore.getIntent(eid);
      if (!intent) continue;

      // Only handle displacements here (dashes, knockbacks, pulls)
      // Normal lane movement is handled by MovementSystem
      if (intent.type === MOVE_TYPE.LANE) continue;

      tickMovement(eid, delta);
    }

    return world;
  };
}
