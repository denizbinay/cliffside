import { defineQuery } from "bitecs";
import {
  Animation,
  ANIM_ACTION,
  Combat,
  EntityType,
  Faction,
  FACTION,
  Health,
  Position,
  Role,
  ROLE,
  StatusEffects,
  Velocity
} from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

const healerUnits = defineQuery([
  Position,
  Velocity,
  Health,
  Combat,
  Faction,
  Role,
  StatusEffects,
  Animation,
  EntityType
]);

const allyUnits = defineQuery([Position, Health, Faction, EntityType]);

export function createHealerSystem(
  getCastleX: (faction: number) => number | null,
  castleStopOffset: number = 40
): (world: GameWorld) => GameWorld {
  return function healerSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = healerUnits(world);
    const allies = allyUnits(world);

    for (const eid of entities) {
      if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
      if (Role.value[eid] !== ROLE.SUPPORT) continue;
      if (Health.current[eid] <= 0) continue;
      if (StatusEffects.stunTimer[eid] > 0) continue;

      const myFaction = Faction.value[eid];
      const myX = Position.x[eid];
      const range = Combat.range[eid];

      let bestEid = 0;
      let bestMissing = 0;

      for (const allyEid of allies) {
        if (!(EntityType.value[allyEid] & ENTITY_TYPE.UNIT)) continue;
        if (Faction.value[allyEid] !== myFaction) continue;
        if (Health.current[allyEid] <= 0) continue;

        const missing = Health.max[allyEid] - Health.current[allyEid];
        if (missing <= 0) continue;

        const dist = Math.abs(Position.x[allyEid] - myX);
        if (dist <= range && missing > bestMissing) {
          bestMissing = missing;
          bestEid = allyEid;
        }
      }

      if (bestEid !== 0) {
        if (Combat.cooldown[eid] === 0) {
          const buffMult = StatusEffects.buffTimer[eid] > 0 ? StatusEffects.buffPower[eid] : 1;
          const healAmount = Combat.healAmount[eid] * buffMult;
          Health.current[bestEid] = Math.min(Health.max[bestEid], Health.current[bestEid] + healAmount);
          Combat.cooldown[eid] = Combat.attackRate[eid];
          Animation.currentAction[eid] = ANIM_ACTION.ATTACK;
        }
        continue;
      }

      let speed = Velocity.baseSpeed[eid];
      if (StatusEffects.slowTimer[eid] > 0) {
        speed *= StatusEffects.slowPower[eid];
      }

      const enemyFaction = myFaction === FACTION.PLAYER ? FACTION.AI : FACTION.PLAYER;
      const enemyCastleX = getCastleX(enemyFaction);
      if (enemyCastleX === null || Number.isNaN(enemyCastleX)) continue;

      const direction = myFaction === FACTION.PLAYER ? 1 : -1;
      const stopX = enemyCastleX + (direction === 1 ? -castleStopOffset : castleStopOffset);

      Position.x[eid] += direction * speed * delta;

      if ((direction === 1 && Position.x[eid] > stopX) || (direction === -1 && Position.x[eid] < stopX)) {
        Position.x[eid] = stopX;
      }

      Animation.currentAction[eid] = ANIM_ACTION.RUN;
    }

    return world;
  };
}
