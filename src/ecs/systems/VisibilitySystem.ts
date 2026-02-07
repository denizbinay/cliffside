/**
 * VisibilitySystem - updates visibility state and reveal sources.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { targetingStore } from "../../sim/Targeting";
import type { GameWorld } from "../world";

const aliveEntities = defineQuery([Health]);

export function createVisibilitySystem(): (world: GameWorld) => GameWorld {
  return function visibilitySystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;

    // Tick reveal sources (remove expired ones)
    targetingStore.tickReveals(delta);

    return world;
  };
}
