/**
 * ActionSystem - ticks actions and handles cast state machine.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { actionStore, tickAction } from "../../sim/ActionSystem";
import { emitCast, SIM_EVENT } from "../../sim/SimEventBus";
import { applyEffects } from "../../sim/EffectSystem";
import type { GameWorld } from "../world";

const aliveEntities = defineQuery([Health]);

export function createActionSystem(): (world: GameWorld) => GameWorld {
  return function actionSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = aliveEntities(world);

    for (const eid of entities) {
      // Tick cooldowns
      actionStore.tickCooldowns(eid, delta);

      // Tick active action
      const action = actionStore.getAction(eid);
      if (!action) continue;

      // Check for start of action (first tick)
      if (action.startTick === world.sim.tick) {
        emitCast(world, SIM_EVENT.CAST_START, eid, action.def.id, action.targetEid);
      }

      const result = tickAction(eid, delta);

      // Emit events
      if (result.released) {
        emitCast(world, SIM_EVENT.CAST_RELEASE, eid, action.def.id, action.targetEid);

        // Apply onRelease effects
        if (action.def.onRelease && action.def.onRelease.length > 0) {
          applyEffects(world, eid, action.targetEid, action.def.onRelease);
        }
      }

      if (result.interrupted) {
        emitCast(world, SIM_EVENT.CAST_CANCEL, eid, action.def.id);
      }
    }

    return world;
  };
}
