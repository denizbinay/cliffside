import { defineQuery, removeEntity } from "bitecs";
import { Death, Health, Render } from "../components";
import type { GameWorld } from "../world";

const deadEntities = defineQuery([Health, Death, Render]);

export function createCleanupSystem(onCleanup: (eid: number) => boolean | void): (world: GameWorld) => GameWorld {
  return function cleanupSystem(world: GameWorld): GameWorld {
    const now = world.time.now;
    const entities = deadEntities(world);

    for (const eid of entities) {
      if (Death.started[eid] === 0) continue;

      const ready = Death.animDone[eid] === 1 || now >= Death.cleanupAt[eid];
      if (ready) {
        const shouldRemove = onCleanup(eid);
        if (shouldRemove !== false) {
          removeEntity(world, eid);
        }
      }
    }

    return world;
  };
}
