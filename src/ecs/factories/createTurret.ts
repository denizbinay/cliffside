import { addEntity } from "bitecs";
import { createTurretArchetype } from "../archetypes/turretArchetype";
import {
  Animation,
  ANIM_ACTION,
  Combat,
  Death,
  Faction,
  Health,
  Position,
  Render,
  Role,
  StatusEffects,
  Target,
  FACTION,
  ROLE
} from "../components";
import { TURRET_CONFIG } from "../../config/GameConfig";
import type { GameWorld } from "../world";
import type { Side } from "../../types";

export interface CreateTurretOptions {
  side: Side;
  x: number;
  y: number;
  maxHp?: number;
  damage?: number;
  range?: number;
  attackRate?: number;
}

export function createTurret(world: GameWorld, options: CreateTurretOptions): number {
  const {
    side,
    x,
    y,
    maxHp = TURRET_CONFIG.maxHp,
    damage = TURRET_CONFIG.damage,
    range = TURRET_CONFIG.range,
    attackRate = TURRET_CONFIG.attackRate
  } = options;

  const eid = addEntity(world);
  createTurretArchetype(world, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;

  Health.max[eid] = maxHp;
  Health.current[eid] = maxHp;

  Combat.damage[eid] = damage;
  Combat.range[eid] = range;
  Combat.attackRate[eid] = attackRate;
  Combat.cooldown[eid] = 0;
  Combat.healAmount[eid] = 0;

  StatusEffects.stunTimer[eid] = 0;
  StatusEffects.slowTimer[eid] = 0;
  StatusEffects.slowPower[eid] = 1;
  StatusEffects.buffTimer[eid] = 0;
  StatusEffects.buffPower[eid] = 1;

  Faction.value[eid] = side === "player" ? FACTION.PLAYER : FACTION.AI;

  Role.value[eid] = ROLE.DAMAGE;
  Target.entityId[eid] = 0;
  Target.distance[eid] = Number.POSITIVE_INFINITY;

  Death.started[eid] = 0;
  Death.animDone[eid] = 0;
  Death.cleanupAt[eid] = 0;

  Animation.currentAction[eid] = ANIM_ACTION.IDLE;
  Animation.locked[eid] = 0;
  Animation.lockUntil[eid] = 0;

  Render.storeIndex[eid] = 0;
  Render.visible[eid] = 1;
  Render.depth[eid] = 3;

  return eid;
}
