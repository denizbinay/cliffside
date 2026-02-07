/**
 * Generic effect definition and registry system.
 *
 * Effects are typed payloads with handlers that can be registered once
 * and invoked many times. This enables data-driven mechanics without
 * bloating core systems.
 */

import type { GameWorld } from "../ecs/world";
import type { ConditionContext, EffectCondition } from "./EffectConditions";
import { evaluateAllConditions } from "./EffectConditions";

// ── Effect Kinds ────────────────────────────────────────────────────

export const EFFECT_KIND = {
  // Damage/heal modifiers
  DAMAGE_FLAT: "damageFlat",
  DAMAGE_PERCENT: "damagePercent",
  HEAL_FLAT: "healFlat",
  HEAL_PERCENT: "healPercent",

  // Status application
  APPLY_STUN: "applyStun",
  APPLY_SLOW: "applySlow",
  APPLY_BUFF: "applyBuff",
  APPLY_SHIELD: "applyShield",

  // Resource manipulation
  RESTORE_MANA: "restoreMana",
  DRAIN_MANA: "drainMana",
  RESET_COOLDOWN: "resetCooldown",
  REDUCE_COOLDOWN: "reduceCooldown",

  // Stack/mark mechanics
  APPLY_MARK: "applyMark",
  CONSUME_MARK: "consumeMark",
  ADD_STACKS: "addStacks",
  CONSUME_STACKS: "consumeStacks",

  // Movement/displacement
  PUSHBACK: "pushback",
  PULL: "pull",
  DASH: "dash",
  BLINK: "blink",

  // Misc
  SPAWN_ENTITY: "spawnEntity",
  TRIGGER_ABILITY: "triggerAbility",
  TRIGGER_ON_HIT: "triggerOnHit",
  CUSTOM: "custom"
} as const;

export type EffectKind = (typeof EFFECT_KIND)[keyof typeof EFFECT_KIND];

// ── Lifecycle Stages ────────────────────────────────────────────────

export const EFFECT_STAGE = {
  ON_APPLY: "onApply",
  ON_TICK: "onTick",
  ON_EXPIRE: "onExpire",
  ON_CONSUME: "onConsume",
  ON_REFRESH: "onRefresh"
} as const;

export type EffectStage = (typeof EFFECT_STAGE)[keyof typeof EFFECT_STAGE];

// ── Effect Definition ───────────────────────────────────────────────

export interface EffectDef<K extends EffectKind = EffectKind, P = unknown> {
  /** Unique kind identifier. */
  kind: K;
  /** Numeric value (damage, heal amount, duration, etc.). */
  value?: number;
  /** Secondary value (e.g., slow power, stack count). */
  power?: number;
  /** Duration in seconds. */
  duration?: number;
  /** Stack count or charges. */
  stacks?: number;
  /** Maximum stacks allowed. */
  maxStacks?: number;
  /** String identifier (mark ID, ability ID, etc.). */
  id?: string;
  /** Conditions that must pass for effect to apply. */
  conditions?: EffectCondition[];
  /** Custom payload for extensibility. */
  payload?: P;
}

// ── Effect Context ──────────────────────────────────────────────────

export interface EffectContext extends ConditionContext {
  /** The effect being applied. */
  effect: EffectDef;
  /** Whether effect was blocked/cancelled. */
  cancelled: boolean;
  /** Numeric result (actual damage dealt, HP healed, etc.). */
  result: number;
  /** The lifecycle stage. */
  stage: EffectStage;
}

// ── Handler Types ───────────────────────────────────────────────────

export type EffectHandler<K extends EffectKind = EffectKind> = (ctx: EffectContext) => void;

// ── Registry ────────────────────────────────────────────────────────

const handlers = new Map<EffectKind, EffectHandler[]>();

export function registerEffectHandler<K extends EffectKind>(kind: K, handler: EffectHandler<K>): void {
  const list = handlers.get(kind) ?? [];
  list.push(handler as EffectHandler);
  handlers.set(kind, list);
}

export function clearEffectHandlers(kind?: EffectKind): void {
  if (kind) {
    handlers.delete(kind);
  } else {
    handlers.clear();
  }
}

// ── Execution ───────────────────────────────────────────────────────

export function triggerEffect(ctx: Omit<EffectContext, "stage">, stage: EffectStage = EFFECT_STAGE.ON_APPLY): void {
  const handlersList = handlers.get(ctx.effect.kind);
  if (!handlersList) return;

  const fullCtx: EffectContext = { ...ctx, stage };

  for (const handler of handlersList) {
    handler(fullCtx);
  }
}

export function applyEffect(
  world: GameWorld,
  sourceEid: number,
  targetEid: number,
  effect: EffectDef,
  conditionCtx?: Partial<ConditionContext>
): EffectContext {
  const ctx: Omit<EffectContext, "stage"> = {
    world,
    sourceEid,
    targetEid,
    effect,
    cancelled: false,
    result: 0,
    isCrit: conditionCtx?.isCrit,
    isKill: conditionCtx?.isKill,
    tags: conditionCtx?.tags,
    marks: conditionCtx?.marks,
    stacks: conditionCtx?.stacks
  };

  // Check conditions
  if (effect.conditions && effect.conditions.length > 0) {
    if (!evaluateAllConditions(effect.conditions, ctx as any)) {
      ctx.cancelled = true;
      return { ...ctx, stage: EFFECT_STAGE.ON_APPLY };
    }
  }

  // Run handlers
  triggerEffect(ctx, EFFECT_STAGE.ON_APPLY);

  return { ...ctx, stage: EFFECT_STAGE.ON_APPLY };
}

export function applyEffects(
  world: GameWorld,
  sourceEid: number,
  targetEid: number,
  effects: EffectDef[],
  conditionCtx?: Partial<ConditionContext>
): EffectContext[] {
  return effects.map((effect) => applyEffect(world, sourceEid, targetEid, effect, conditionCtx));
}

// ── Active Effect Runtime ───────────────────────────────────────────

/**
 * Runtime effect instance attached to an entity.
 * Used for timed effects (buffs, debuffs, DoTs, marks).
 */
export interface ActiveEffect {
  /** Unique instance ID for this effect application. */
  instanceId: number;
  /** The definition this instance is based on. */
  def: EffectDef;
  /** Entity that applied this effect. */
  sourceEid: number;
  /** Entity this effect is attached to. */
  targetEid: number;
  /** Remaining duration in seconds. */
  remainingDuration: number;
  /** Current stack count. */
  stacks: number;
  /** Tick when effect was applied. */
  appliedTick: number;
  /** Custom state for complex effects. */
  state?: unknown;
}

let nextInstanceId = 1;

export function createActiveEffect(def: EffectDef, sourceEid: number, targetEid: number, tick: number): ActiveEffect {
  return {
    instanceId: nextInstanceId++,
    def,
    sourceEid,
    targetEid,
    remainingDuration: def.duration ?? 0,
    stacks: def.stacks ?? 1,
    appliedTick: tick,
    state: undefined
  };
}

/**
 * Tick an active effect. Returns true if effect should continue, false if expired.
 */
export function tickActiveEffect(effect: ActiveEffect, delta: number): boolean {
  if (effect.remainingDuration <= 0) return false;
  effect.remainingDuration = Math.max(0, effect.remainingDuration - delta);
  return effect.remainingDuration > 0;
}

/**
 * Add stacks to an active effect, respecting maxStacks.
 */
export function addEffectStacks(effect: ActiveEffect, count: number): void {
  const max = effect.def.maxStacks ?? Infinity;
  effect.stacks = Math.min(max, effect.stacks + count);
}

/**
 * Consume stacks from an active effect. Returns number actually consumed.
 */
export function consumeEffectStacks(effect: ActiveEffect, count: number): number {
  const consumed = Math.min(effect.stacks, count);
  effect.stacks -= consumed;
  return consumed;
}

/**
 * Refresh an active effect's duration.
 */
export function refreshEffectDuration(effect: ActiveEffect): void {
  effect.remainingDuration = effect.def.duration ?? 0;
}
