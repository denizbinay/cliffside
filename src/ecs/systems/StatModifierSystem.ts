/**
 * StatModifierSystem - ticks all stat modifiers and removes expired ones.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { statModifierStore } from "../../sim/Stats";
import type { GameWorld } from "../world";

const aliveEntities = defineQuery([Health]);

export function createStatModifierSystem(): (world: GameWorld) => GameWorld {
  return function statModifierSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = aliveEntities(world);

    for (const eid of entities) {
      statModifierStore.tick(eid, delta);
    }

    return world;
  };
}
