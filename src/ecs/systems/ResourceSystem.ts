/**
 * ResourceSystem - ticks resource regen/recharge/decay for all entities.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { resourceStore, tickResource } from "../../sim/Resources";
import type { GameWorld } from "../world";

const aliveEntities = defineQuery([Health]);

export function createResourceSystem(): (world: GameWorld) => GameWorld {
  return function resourceSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = aliveEntities(world);

    for (const eid of entities) {
      tickResource(eid, delta);
    }

    return world;
  };
}
