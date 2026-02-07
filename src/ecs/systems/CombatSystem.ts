import { defineQuery, hasComponent } from "bitecs";
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
  Target,
  UnitConfig
} from "../components";
import { COMBAT_CONFIG } from "../../config/GameConfig";
import { ENTITY_TYPE } from "../constants";
import type { StatusOnHit } from "../../types";
import type { GameWorld } from "../world";
import type { ConfigStore } from "../stores/ConfigStore";

const attackers = defineQuery([Position, Health, Combat, Faction, Target, StatusEffects, Animation, Role, EntityType]);

const castles = defineQuery([Position, Health, Faction, EntityType]);

export function createCombatSystem(configStore?: ConfigStore): (world: GameWorld) => GameWorld {
  return function combatSystem(world: GameWorld): GameWorld {
    const entities = attackers(world);
    const castleEntities = castles(world);
    const castleByFaction = new Map<number, number>();
    const castleXByFaction = new Map<number, number>();

    for (const castleEid of castleEntities) {
      if (!(EntityType.value[castleEid] & ENTITY_TYPE.CASTLE)) continue;
      if (Health.current[castleEid] <= 0) continue;
      const faction = Faction.value[castleEid];
      castleByFaction.set(faction, castleEid);
      castleXByFaction.set(faction, Position.x[castleEid]);
    }

    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;
      const entityType = EntityType.value[eid];
      const isUnit = (entityType & ENTITY_TYPE.UNIT) !== 0;
      const isTurret = (entityType & ENTITY_TYPE.TURRET) !== 0;
      if (!isUnit && !isTurret) continue;
      if (Role.value[eid] === ROLE.SUPPORT) continue;
      if (StatusEffects.stunTimer[eid] > 0) continue;
      if (Combat.cooldown[eid] > 0) continue;

      const buffMult = StatusEffects.buffTimer[eid] > 0 ? StatusEffects.buffPower[eid] : 1;
      const damage = Combat.damage[eid] * buffMult;
      const targetEid = Target.entityId[eid];

      if (targetEid !== 0) {
        const targetAlive = Health.current[targetEid] > 0;
        const targetInRange = Math.abs(Position.x[targetEid] - Position.x[eid]) <= Combat.range[eid];

        if (targetAlive && targetInRange) {
          Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage);
          Combat.cooldown[eid] = Combat.attackRate[eid];
          Animation.currentAction[eid] = ANIM_ACTION.ATTACK;
          if (isUnit) {
            applyStatusOnHit(world, eid, targetEid, configStore);
          }
          continue;
        }

        Target.entityId[eid] = 0;
        Target.distance[eid] = Number.POSITIVE_INFINITY;
      }

      if (isUnit) {
        const myFaction = Faction.value[eid];
        const enemyFaction = myFaction === FACTION.PLAYER ? FACTION.AI : FACTION.PLAYER;
        const enemyCastleEid = castleByFaction.get(enemyFaction);
        const enemyCastleX = castleXByFaction.get(enemyFaction);

        if (enemyCastleEid !== undefined && enemyCastleX !== undefined) {
          const dist = Math.abs(enemyCastleX - Position.x[eid]);
          if (dist <= COMBAT_CONFIG.castleAttackRange) {
            Health.current[enemyCastleEid] = Math.max(0, Health.current[enemyCastleEid] - damage);
            Combat.cooldown[eid] = Combat.attackRate[eid];
            Animation.currentAction[eid] = ANIM_ACTION.ATTACK;
          }
        }
      }
    }

    return world;
  };
}

function applyStatusOnHit(world: GameWorld, attackerEid: number, targetEid: number, configStore?: ConfigStore): void {
  if (!configStore) return;
  if (!(EntityType.value[targetEid] & ENTITY_TYPE.UNIT)) return;
  if (!hasComponent(world, UnitConfig, attackerEid)) return;

  const config = configStore.getUnitConfigByIndex(UnitConfig.typeIndex[attackerEid]);
  const status = config?.statusOnHit;
  if (!status) return;

  applyStatusEffect(attackerEid, targetEid, status);
}

function applyStatusEffect(attackerEid: number, targetEid: number, status: StatusOnHit): void {
  if (status.type === "stun") {
    const duration = status.duration || 0;
    StatusEffects.stunTimer[targetEid] = Math.max(StatusEffects.stunTimer[targetEid], duration);
  }

  if (status.type === "slow") {
    const duration = status.duration || 0;
    const power = status.power || 1;
    StatusEffects.slowTimer[targetEid] = Math.max(StatusEffects.slowTimer[targetEid], duration);
    StatusEffects.slowPower[targetEid] = power;
  }

  if (status.type === "pushback") {
    const strength = status.strength || 0;
    const direction = Faction.value[attackerEid] === FACTION.PLAYER ? 1 : -1;
    Position.x[targetEid] += direction * strength;
    StatusEffects.stunTimer[targetEid] = Math.max(StatusEffects.stunTimer[targetEid], 0.3);
  }
}
