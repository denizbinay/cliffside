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
import { DAMAGE_TYPE } from "../../sim/DamageTypes";
import { DAMAGE_FLAGS, type DamagePipeline, type DamageContext } from "../../sim/DamagePipeline";
import type { GameWorld } from "../world";
import type { ConfigStore } from "../stores/ConfigStore";
import { emitCombat, SIM_EVENT } from "../../sim/SimEventBus";
import type { StatusOnHit } from "../../types";

// New imports
import { getStat, STAT } from "../../sim/Stats";
import { checkEligibility, TARGET_FLAG } from "../../sim/Targeting";
import {
  actionStore,
  startAction,
  type ActionDef,
  ABILITY_FLAG,
  INTERRUPT,
  ACTION_STATE
} from "../../sim/ActionSystem";
import { EFFECT_KIND } from "../../sim/EffectSystem";

const attackers = defineQuery([Position, Health, Combat, Faction, Target, StatusEffects, Animation, Role, EntityType]);
const castles = defineQuery([Position, Health, Faction, EntityType]);

export function createCombatSystem(world: GameWorld, configStore?: ConfigStore): (world: GameWorld) => GameWorld {
  // Register core handlers directly to the pipeline
  registerCoreCombatHandlers(world.sim.pipeline, configStore);

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
      // Skip supports (healers handled elsewhere usually, or maybe they attack too?)
      if (Role.value[eid] === ROLE.SUPPORT) continue;

      // ActionSystem handles cooldown checks and state, but we need to know if we can start a new one.
      if (!actionStore.isIdle(eid)) continue;

      const targetEid = Target.entityId[eid];
      let finalTargetEid = 0;

      // 1. Resolve Target
      if (targetEid !== 0) {
        const range = getStat(eid, STAT.RANGE, Combat.range[eid]);
        const eligibility = checkEligibility({
          sourceEid: eid,
          targetEid,
          sourceX: Position.x[eid],
          sourceY: Position.y[eid],
          maxRange: range,
          requiresVision: true,
          isSpell: false,
          isAttack: true,
          ignoreFaction: false
        });

        if (eligibility.eligible) {
          finalTargetEid = targetEid;
        } else {
          // Lost target
          Target.entityId[eid] = 0;
          Target.distance[eid] = Number.POSITIVE_INFINITY;
        }
      }

      // 2. Auto-target Castle if no target
      if (finalTargetEid === 0 && EntityType.value[eid] & ENTITY_TYPE.UNIT) {
        const myFaction = Faction.value[eid];
        const enemyFaction = myFaction === FACTION.PLAYER ? FACTION.AI : FACTION.PLAYER;
        const enemyCastleEid = castleByFaction.get(enemyFaction);
        const enemyCastleX = castleXByFaction.get(enemyFaction);

        if (enemyCastleEid !== undefined && enemyCastleX !== undefined) {
          // Simple range check for castle (fixed structure)
          const dist = Math.abs(enemyCastleX - Position.x[eid]);
          if (dist <= COMBAT_CONFIG.castleAttackRange) {
            finalTargetEid = enemyCastleEid;
          }
        }
      }

      // 3. Start Attack Action
      if (finalTargetEid !== 0) {
        const baseDamage = Combat.damage[eid];

        // Use getStat for base stats to support Modifiers
        // We removed the manual buffMult check because EffectHandlers now register StatModifiers for buffs
        const damage = getStat(eid, STAT.ATTACK_DAMAGE, baseDamage);

        // Attack Speed / Cooldown
        const attackRate = Combat.attackRate[eid]; // This is "period" (seconds per attack)
        // If we want attack speed modifiers to work, we should treat this as a stat.
        // But Combat.attackRate is period.
        // Let's assume STAT.ATTACK_SPEED is a multiplier (1.0 default).
        // New Period = Base Period / Attack Speed Multiplier
        const attackSpeedMult = getStat(eid, STAT.ATTACK_SPEED, 1.0);
        const attackPeriod = Math.max(0.1, attackRate / attackSpeedMult);

        // Define Action
        // Windup is typically 30-50% of the attack period.
        const windup = attackPeriod * 0.3;
        const recovery = attackPeriod * 0.2;
        const cooldown = attackPeriod - windup - recovery;

        const attackAction: ActionDef = {
          id: "auto_attack",
          windup,
          channel: 0,
          recovery,
          cooldown,
          flags: ABILITY_FLAG.ATTACK,
          interruptedBy: INTERRUPT.HARD_CC | INTERRUPT.DISARM,
          cost: 0,
          onRelease: [{ kind: EFFECT_KIND.DAMAGE_FLAT, value: damage }]
        };

        const result = startAction(eid, attackAction, finalTargetEid, world.sim.tick);

        if (result.success) {
          // Animation sync
          Animation.currentAction[eid] = ANIM_ACTION.ATTACK;
          // We don't need emitCombat(ATTACK_START) here because ActionSystemECS emits CAST_START?
          // ActionSystem emits CAST_START. UI should map CAST_START(id="auto_attack") to animation.
          // But for backward compat with existing UI that listens for ATTACK_START:
          emitCombat(world, SIM_EVENT.ATTACK_START, eid, finalTargetEid);
        }
      }
    }

    return world;
  };
}

// Keep registerCoreCombatHandlers mostly as is, but remove resolveAttack since it's now handled by the pipeline/action
function registerCoreCombatHandlers(pipeline: DamagePipeline, configStore?: ConfigStore): void {
  // 1. Critical Strike (Pre-Mitigation)
  pipeline.onDamage("preMitigation", (ctx) => {
    if (!configStore) return;
    const config = getAttackerConfig(ctx.world, ctx.sourceEid, configStore);
    if (!config?.critChance) return;

    // Check RNG
    const roll = ctx.world.sim.rng.nextFloat();
    if (roll <= config.critChance) {
      const multiplier = config.critMultiplier ?? 1.5;
      ctx.amount *= multiplier;
      ctx.flags |= DAMAGE_FLAGS.CRIT;
    }
  });

  // 2. On-Hit Status Effects (Post-Damage)
  pipeline.onDamage("postDamage", (ctx) => {
    if (!configStore) return;
    if (!(EntityType.value[ctx.targetEid] & ENTITY_TYPE.UNIT)) return;

    applyStatusOnHit(ctx.world, ctx.sourceEid, ctx.targetEid, configStore);
  });

  // 3. On-Kill Buffs (On-Kill)
  pipeline.onDamage("onKill", (ctx) => {
    if (!configStore) return;
    const config = getAttackerConfig(ctx.world, ctx.sourceEid, configStore);
    const onKill = config?.onKill;
    if (!onKill || onKill.type !== "selfBuff") return;

    StatusEffects.buffTimer[ctx.sourceEid] = Math.max(StatusEffects.buffTimer[ctx.sourceEid], onKill.duration);
    StatusEffects.buffPower[ctx.sourceEid] = Math.max(StatusEffects.buffPower[ctx.sourceEid], onKill.power);
  });
}

function getAttackerConfig(world: GameWorld, attackerEid: number, configStore: ConfigStore) {
  if (!hasComponent(world, UnitConfig, attackerEid)) return null;
  return configStore.getUnitConfigByIndex(UnitConfig.typeIndex[attackerEid]);
}

function applyStatusOnHit(world: GameWorld, attackerEid: number, targetEid: number, configStore?: ConfigStore): void {
  if (!configStore) return;
  const config = getAttackerConfig(world, attackerEid, configStore);
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
