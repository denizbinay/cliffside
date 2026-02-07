/**
 * Unified damage & heal transaction pipeline.
 *
 * ALL HP mutations in the game route through applyDamage / applyHeal.
 * Hooks at each stage allow future mechanics (shields, armor, anti-heal,
 * lifesteal, execute, etc.) to plug in without touching callers.
 */

import { Health } from "../ecs/components/Health";
import { DAMAGE_TYPE, type DamageType } from "./DamageTypes";
import type { GameWorld } from "../ecs/world";

// ── Damage ──────────────────────────────────────────────────────────

/** Bit-flags carried on a damage packet for downstream consumers. */
export const DAMAGE_FLAGS = {
  NONE: 0,
  CRIT: 1 << 0,
  DOT: 1 << 1,
  REFLECT: 1 << 2,
  PROC: 1 << 3,
  EXECUTE: 1 << 4,
  AOE: 1 << 5,
  LIFESTEAL: 1 << 6
} as const;

export type DamageFlags = number;

/** Tags are freeform strings for mechanic identification (e.g. "ignite", "thornmail"). */
export type DamageTag = string;

/**
 * Mutable context that flows through the damage pipeline.
 * Hooks read and mutate fields; the pipeline applies the final `amount`.
 */
export interface DamageContext {
  readonly world: GameWorld;
  readonly sourceEid: number;
  readonly targetEid: number;
  readonly damageType: DamageType;
  /** Base amount before any modifications. */
  readonly baseAmount: number;
  /** Current amount — hooks mutate this. */
  amount: number;
  flags: DamageFlags;
  tags: Set<DamageTag>;
  /** Amount absorbed by shields (written by pipeline). */
  shieldAbsorbed: number;
  /** Whether the target died from this damage (written by pipeline). */
  didKill: boolean;
  /** HP of target before damage was applied (written by pipeline). */
  previousHp: number;
}

export type DamageHook = (ctx: DamageContext) => void;

// ── Heal ────────────────────────────────────────────────────────────

export type HealTag = string;

export interface HealContext {
  readonly world: GameWorld;
  readonly sourceEid: number;
  readonly targetEid: number;
  /** Base amount before any modifications. */
  readonly baseAmount: number;
  /** Current amount — hooks mutate this. */
  amount: number;
  tags: Set<HealTag>;
  /** Actual HP restored after clamping (written by pipeline). */
  actualHealed: number;
}

export type HealHook = (ctx: HealContext) => void;

// ── Pipeline ────────────────────────────────────────────────────────

export type DamageStage = "preMitigation" | "mitigation" | "postDamage" | "onKill";
export type HealStage = "preHeal" | "postHeal";

export class DamagePipeline {
  private damageHooks: Record<DamageStage, DamageHook[]> = {
    preMitigation: [],
    mitigation: [],
    postDamage: [],
    onKill: []
  };

  private healHooks: Record<HealStage, HealHook[]> = {
    preHeal: [],
    postHeal: []
  };

  // ── Registration ────────────────────────────────────────────────

  onDamage(stage: DamageStage, hook: DamageHook): void {
    this.damageHooks[stage].push(hook);
  }

  onHeal(stage: HealStage, hook: HealHook): void {
    this.healHooks[stage].push(hook);
  }

  // ── Execution ───────────────────────────────────────────────────

  applyDamage(
    world: GameWorld,
    sourceEid: number,
    targetEid: number,
    baseAmount: number,
    damageType: DamageType = DAMAGE_TYPE.PHYSICAL,
    flags: DamageFlags = DAMAGE_FLAGS.NONE,
    tags?: Iterable<DamageTag>
  ): DamageContext {
    const ctx: DamageContext = {
      world,
      sourceEid,
      targetEid,
      damageType,
      baseAmount,
      amount: baseAmount,
      flags,
      tags: new Set(tags),
      shieldAbsorbed: 0,
      didKill: false,
      previousHp: Health.current[targetEid]
    };

    // Stage 1: pre-mitigation (crit multipliers, damage amplification, execute scaling)
    for (const hook of this.damageHooks.preMitigation) {
      hook(ctx);
    }

    // Stage 2: mitigation (armor, MR, shields, damage reduction, invulnerability)
    for (const hook of this.damageHooks.mitigation) {
      hook(ctx);
    }

    // Clamp and apply
    const finalAmount = Math.max(0, ctx.amount);
    ctx.amount = finalAmount;
    const hp = Health.current[targetEid];
    Health.current[targetEid] = Math.max(0, hp - finalAmount);
    ctx.didKill = hp > 0 && Health.current[targetEid] <= 0;

    // Stage 3: post-damage reactions (lifesteal, thorns, on-hit procs)
    for (const hook of this.damageHooks.postDamage) {
      hook(ctx);
    }

    // Stage 4: on-kill reactions (resets, bounties, on-kill buffs)
    if (ctx.didKill) {
      for (const hook of this.damageHooks.onKill) {
        hook(ctx);
      }
    }

    return ctx;
  }

  applyHeal(
    world: GameWorld,
    sourceEid: number,
    targetEid: number,
    baseAmount: number,
    tags?: Iterable<HealTag>
  ): HealContext {
    const ctx: HealContext = {
      world,
      sourceEid,
      targetEid,
      baseAmount,
      amount: baseAmount,
      tags: new Set(tags),
      actualHealed: 0
    };

    // Stage 1: pre-heal (anti-heal reduction, heal amplification)
    for (const hook of this.healHooks.preHeal) {
      hook(ctx);
    }

    // Clamp and apply
    const finalAmount = Math.max(0, ctx.amount);
    ctx.amount = finalAmount;
    const before = Health.current[targetEid];
    Health.current[targetEid] = Math.min(Health.max[targetEid], before + finalAmount);
    ctx.actualHealed = Health.current[targetEid] - before;

    // Stage 2: post-heal reactions (overheal shield, post-heal procs)
    for (const hook of this.healHooks.postHeal) {
      hook(ctx);
    }

    return ctx;
  }

  /** Remove all hooks. Useful for test isolation or world reset. */
  clear(): void {
    for (const stage of Object.keys(this.damageHooks) as DamageStage[]) {
      this.damageHooks[stage] = [];
    }
    for (const stage of Object.keys(this.healHooks) as HealStage[]) {
      this.healHooks[stage] = [];
    }
  }
}
