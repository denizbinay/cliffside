import { addEntity } from "bitecs";
import { createUnitArchetype } from "../archetypes/unitArchetype";
import {
  Animation,
  Collision,
  Combat,
  Death,
  Faction,
  Health,
  Position,
  Presence,
  Render,
  Role,
  StatusEffects,
  Target,
  UnitConfig,
  Velocity,
  ANIM_ACTION,
  FACTION,
  ROLE
} from "../components";
import { UNIT_SIZE, DEPTH } from "../../config/GameConfig";
import type { GameWorld } from "../world";
import type { Side, StanceModifiers, UnitRole, UnitTypeConfig } from "../../types";
import type { ConfigStore } from "../stores/ConfigStore";
import type { UnitPool } from "../stores/UnitPool";

export interface CreateUnitOptions {
  config: UnitTypeConfig;
  side: Side;
  x: number;
  y: number;
  modifiers?: Partial<StanceModifiers>;
  presenceMult?: number;
  configStore?: ConfigStore;
  pool?: UnitPool;
}

const ROLE_MAP: Record<UnitRole, number> = {
  frontline: ROLE.FRONTLINE,
  damage: ROLE.DAMAGE,
  support: ROLE.SUPPORT,
  disruptor: ROLE.DISRUPTOR
};

export function createUnit(world: GameWorld, options: CreateUnitOptions): number {
  const { config, side, x, y, modifiers = {}, presenceMult = 1, configStore, pool } = options;

  const eid = pool?.acquire(world) ?? addEntity(world);
  createUnitArchetype(world, eid);

  const hpMult = modifiers.hpMult || 1;
  const dmgMult = modifiers.dmgMult || 1;
  const rangeMult = modifiers.rangeMult || 1;
  const speedMult = modifiers.speedMult || 1;
  const attackRateMult = modifiers.attackRateMult || 1;
  const healMult = modifiers.healMult || 1;

  Position.x[eid] = x;
  Position.y[eid] = y;

  Velocity.baseSpeed[eid] = config.speed * speedMult;
  Velocity.vx[eid] = 0;
  Velocity.vy[eid] = 0;

  Health.max[eid] = config.hp * hpMult;
  Health.current[eid] = Health.max[eid];

  Combat.damage[eid] = config.dmg * dmgMult;
  Combat.range[eid] = config.range * rangeMult;
  Combat.attackRate[eid] = config.attackRate * attackRateMult;
  Combat.cooldown[eid] = 0;
  Combat.healAmount[eid] = (config.healAmount || 0) * healMult;

  StatusEffects.stunTimer[eid] = 0;
  StatusEffects.slowTimer[eid] = 0;
  StatusEffects.slowPower[eid] = 1;
  StatusEffects.buffTimer[eid] = 0;
  StatusEffects.buffPower[eid] = 1;

  Faction.value[eid] = side === "player" ? FACTION.PLAYER : FACTION.AI;
  Role.value[eid] = ROLE_MAP[config.role] ?? ROLE.DAMAGE;

  Target.entityId[eid] = 0;
  Target.distance[eid] = Number.POSITIVE_INFINITY;

  const size = UNIT_SIZE[config.role] || UNIT_SIZE.default;
  UnitConfig.typeIndex[eid] = configStore?.getUnitIndex(config.id) ?? 0;
  UnitConfig.size[eid] = size;
  UnitConfig.color[eid] = config.color;

  Collision.radius[eid] = size / 2;
  Collision.blockedBy[eid] = 0;

  Presence.baseValue[eid] = config.presence;
  Presence.multiplier[eid] = presenceMult;

  Death.started[eid] = 0;
  Death.animDone[eid] = 0;
  Death.cleanupAt[eid] = 0;

  Animation.currentAction[eid] = ANIM_ACTION.IDLE;
  Animation.locked[eid] = 0;
  Animation.lockUntil[eid] = 0;

  Render.storeIndex[eid] = 0;
  Render.visible[eid] = 1;
  Render.depth[eid] = DEPTH.UNITS;

  return eid;
}
