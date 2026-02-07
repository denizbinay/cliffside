import { defineQuery } from "bitecs";
import { Combat, EntityType, Faction, Health, Position, Role, ROLE, Target } from "../components";
import { ENTITY_TYPE } from "../constants";
import { SpatialHash1D } from "../spatial/SpatialHash";
import type { GameWorld } from "../world";

const combatants = defineQuery([Position, Health, Combat, Faction, Target, Role, EntityType]);
const targetables = defineQuery([Position, Health, Faction, EntityType]);

const TARGETABLE_MASK = ENTITY_TYPE.UNIT | ENTITY_TYPE.TURRET;
const ATTACKER_MASK = ENTITY_TYPE.UNIT | ENTITY_TYPE.TURRET;

export function createTargetingSystem(): (world: GameWorld) => GameWorld {
  const spatial = new SpatialHash1D(100);

  return function targetingSystem(world: GameWorld): GameWorld {
    const entities = combatants(world);
    const potentialTargets = targetables(world);

    spatial.clear();
    for (const targetEid of potentialTargets) {
      if (Health.current[targetEid] <= 0) continue;
      if ((EntityType.value[targetEid] & TARGETABLE_MASK) === 0) continue;
      spatial.insert(targetEid, Position.x[targetEid]);
    }

    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      if (!(EntityType.value[eid] & ATTACKER_MASK)) continue;
      if (Role.value[eid] === ROLE.SUPPORT) continue;

      const myFaction = Faction.value[eid];
      const myX = Position.x[eid];
      const myRange = Combat.range[eid];
      const isTurret = (EntityType.value[eid] & ENTITY_TYPE.TURRET) !== 0;
      const targetMask = isTurret ? ENTITY_TYPE.UNIT : TARGETABLE_MASK;

      let closestEid = 0;
      let closestDist = Number.POSITIVE_INFINITY;

      for (const otherEid of spatial.queryRadius(myX, myRange)) {
        if (otherEid === eid) continue;
        if (!(EntityType.value[otherEid] & targetMask)) continue;
        if (Faction.value[otherEid] === myFaction) continue;
        if (Health.current[otherEid] <= 0) continue;

        const dist = Math.abs(Position.x[otherEid] - myX);
        if (dist <= myRange && dist < closestDist) {
          closestDist = dist;
          closestEid = otherEid;
        }
      }

      Target.entityId[eid] = closestEid;
      Target.distance[eid] = closestEid ? closestDist : Number.POSITIVE_INFINITY;
    }

    return world;
  };
}
