/**
 * Effect condition system.
 *
 * Conditions can be evaluated to determine if an effect should trigger.
 * Used for mark-consume patterns, execute thresholds, stack requirements, etc.
 */

import { Health } from "../ecs/components/Health";
import { StatusEffects } from "../ecs/components/StatusEffects";
import { Faction, FACTION } from "../ecs/components/Faction";
import type { GameWorld } from "../ecs/world";

// ── Condition Types ─────────────────────────────────────────────────

export const CONDITION_TYPE = {
  ALWAYS: "always",
  HP_BELOW: "hpBelow",
  HP_ABOVE: "hpAbove",
  HP_MISSING_ABOVE: "hpMissingAbove",
  HAS_STATUS: "hasStatus",
  NO_STATUS: "noStatus",
  HAS_TAG: "hasTag",
  TARGET_IS_MARKED: "targetIsMarked",
  RANDOM_CHANCE: "randomChance",
  ON_CRIT: "onCrit",
  ON_KILL: "onKill",
  FACTION_MATCH: "factionMatch",
  STACKS_AT_LEAST: "stacksAtLeast"
} as const;

export type ConditionType = (typeof CONDITION_TYPE)[keyof typeof CONDITION_TYPE];

// ── Condition Definitions ───────────────────────────────────────────

export interface BaseCondition {
  type: ConditionType;
}

export interface AlwaysCondition extends BaseCondition {
  type: "always";
}

export interface HpThresholdCondition extends BaseCondition {
  type: "hpBelow" | "hpAbove";
  /** Threshold as ratio 0-1 */
  threshold: number;
}

export interface HpMissingCondition extends BaseCondition {
  type: "hpMissingAbove";
  /** Missing HP threshold (flat value) */
  amount: number;
}

export interface HasStatusCondition extends BaseCondition {
  type: "hasStatus" | "noStatus";
  status: "stun" | "slow" | "buff";
}

export interface HasTagCondition extends BaseCondition {
  type: "hasTag";
  tag: string;
}

export interface MarkedCondition extends BaseCondition {
  type: "targetIsMarked";
  markId: string;
}

export interface RandomChanceCondition extends BaseCondition {
  type: "randomChance";
  /** Chance as ratio 0-1 */
  chance: number;
}

export interface OnCritCondition extends BaseCondition {
  type: "onCrit";
}

export interface OnKillCondition extends BaseCondition {
  type: "onKill";
}

export interface FactionMatchCondition extends BaseCondition {
  type: "factionMatch";
  /** "same" or "enemy" */
  relation: "same" | "enemy";
}

export interface StacksCondition extends BaseCondition {
  type: "stacksAtLeast";
  stackId: string;
  minStacks: number;
}

export type EffectCondition =
  | AlwaysCondition
  | HpThresholdCondition
  | HpMissingCondition
  | HasStatusCondition
  | HasTagCondition
  | MarkedCondition
  | RandomChanceCondition
  | OnCritCondition
  | OnKillCondition
  | FactionMatchCondition
  | StacksCondition;

// ── Evaluation Context ──────────────────────────────────────────────

export interface ConditionContext {
  world: GameWorld;
  sourceEid: number;
  targetEid: number;
  isCrit?: boolean;
  isKill?: boolean;
  tags?: Set<string>;
  marks?: Map<string, number>; // markId -> expireTick
  stacks?: Map<string, number>; // stackId -> count
}

// ── Evaluator ───────────────────────────────────────────────────────

export function evaluateCondition(condition: EffectCondition, ctx: ConditionContext): boolean {
  switch (condition.type) {
    case "always":
      return true;

    case "hpBelow": {
      const ratio = Health.current[ctx.targetEid] / Health.max[ctx.targetEid];
      return ratio < condition.threshold;
    }

    case "hpAbove": {
      const ratio = Health.current[ctx.targetEid] / Health.max[ctx.targetEid];
      return ratio > condition.threshold;
    }

    case "hpMissingAbove": {
      const missing = Health.max[ctx.targetEid] - Health.current[ctx.targetEid];
      return missing > condition.amount;
    }

    case "hasStatus": {
      const timer = getStatusTimer(ctx.targetEid, condition.status);
      return timer > 0;
    }

    case "noStatus": {
      const timer = getStatusTimer(ctx.targetEid, condition.status);
      return timer <= 0;
    }

    case "hasTag":
      return ctx.tags?.has(condition.tag) ?? false;

    case "targetIsMarked": {
      const expireTick = ctx.marks?.get(condition.markId);
      if (expireTick === undefined) return false;
      return ctx.world.sim.tick < expireTick;
    }

    case "randomChance":
      return ctx.world.sim.rng.nextFloat() < condition.chance;

    case "onCrit":
      return ctx.isCrit === true;

    case "onKill":
      return ctx.isKill === true;

    case "factionMatch": {
      const srcFaction = Faction.value[ctx.sourceEid];
      const tgtFaction = Faction.value[ctx.targetEid];
      if (condition.relation === "same") return srcFaction === tgtFaction;
      return srcFaction !== tgtFaction;
    }

    case "stacksAtLeast": {
      const count = ctx.stacks?.get(condition.stackId) ?? 0;
      return count >= condition.minStacks;
    }

    default:
      return false;
  }
}

export function evaluateAllConditions(conditions: EffectCondition[], ctx: ConditionContext): boolean {
  for (const cond of conditions) {
    if (!evaluateCondition(cond, ctx)) return false;
  }
  return true;
}

export function evaluateAnyCondition(conditions: EffectCondition[], ctx: ConditionContext): boolean {
  for (const cond of conditions) {
    if (evaluateCondition(cond, ctx)) return true;
  }
  return false;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getStatusTimer(eid: number, status: "stun" | "slow" | "buff"): number {
  switch (status) {
    case "stun":
      return StatusEffects.stunTimer[eid];
    case "slow":
      return StatusEffects.slowTimer[eid];
    case "buff":
      return StatusEffects.buffTimer[eid];
  }
}
