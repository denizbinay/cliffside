import { defineQuery } from "bitecs";
import { Combat, EntityType, Faction, Health, Position, Role, ROLE, Target, Collision } from "../components";
import { ENTITY_TYPE } from "../constants";
import { SpatialHash1D } from "../spatial/SpatialHash";
import type { GameWorld } from "../world";
import { checkEligibility } from "../../sim/Targeting";

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
      // We rely on checkEligibility for advanced checks, but basic type mask is fine here
      if ((EntityType.value[targetEid] & TARGETABLE_MASK) === 0) continue;
      spatial.insert(targetEid, Position.x[targetEid]);
    }

    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      if (!(EntityType.value[eid] & ATTACKER_MASK)) continue;
      // Supports don't attack (for now)
      if (Role.value[eid] === ROLE.SUPPORT) continue;

      const myFaction = Faction.value[eid];
      const myX = Position.x[eid];
      const myRange = Combat.range[eid];
      const isTurret = (EntityType.value[eid] & ENTITY_TYPE.TURRET) !== 0;
      // Turrets target units; units target units+turrets (usually)
      // Wait, units should target turrets too? Yes.
      const targetMask = isTurret ? ENTITY_TYPE.UNIT : TARGETABLE_MASK;

      let closestEid = 0;
      let closestDist = Number.POSITIVE_INFINITY;

      // Query spatial hash for potential targets in range
      // We query slightly larger than range to be safe, or just range
      for (const otherEid of spatial.queryRadius(myX, myRange)) {
        if (otherEid === eid) continue;

        // Basic filter
        if (!(EntityType.value[otherEid] & targetMask)) continue;
        if (Health.current[otherEid] <= 0) continue;

        // Use the centralized eligibility check
        // This handles: Faction, Range (redundant but safe), Visibility, Immunity
        const eligibility = checkEligibility({
          sourceEid: eid,
          targetEid: otherEid,
          sourceX: myX,
          sourceY: Position.y[eid],
          maxRange: myRange,
          requiresVision: true,
          isSpell: false, // Auto-attacks are not spells usually
          isAttack: true,
          ignoreFaction: false,
          sourceRadius: Collision.radius[eid] || 0,
          targetRadius: Collision.radius[otherEid] || 0
        });

        if (!eligibility.eligible) continue;

        const dist = Math.abs(Position.x[otherEid] - myX);
        if (dist < closestDist) {
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
