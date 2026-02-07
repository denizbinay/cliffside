/**
 * ShieldSystem - ticks shields and removes expired ones.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { shieldStore } from "../../sim/Shields";
import type { GameWorld } from "../world";

const aliveEntities = defineQuery([Health]);

export function createShieldSystem(): (world: GameWorld) => GameWorld {
  return function shieldSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = aliveEntities(world);

    for (const eid of entities) {
      shieldStore.tick(eid, delta);
    }

    return world;
  };
}
