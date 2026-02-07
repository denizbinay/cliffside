/**
 * Standard effect handlers for common game mechanics.
 *
 * Registers handlers for:
 * - Damage/Heal effects
 * - Status application (stun, slow, buff)
 * - Resource manipulation
 * - Movement (displacements)
 */

import { EFFECT_KIND, registerEffectHandler, type EffectContext, EFFECT_STAGE } from "./EffectSystem";
import { DAMAGE_TYPE } from "./DamageTypes";
import { DAMAGE_FLAGS } from "./DamagePipeline";
import { StatusEffects } from "../ecs/components/StatusEffects";
import { restoreResource, spendResource, addStacks } from "./Resources";
import { consumeEffectStacks } from "./EffectSystem";
import { applyKnockback, applyPull, startDash, blink } from "./Movement";
import { Position } from "../ecs/components/Position";
import { activeEffectsStore } from "../ecs/stores/ActiveEffectsStore";
import { createActiveEffect, type EffectDef } from "./EffectSystem";
import { statModifierStore, STAT, MODIFIER_TYPE } from "./Stats";

export function registerStandardEffectHandlers(): void {
  // ── Damage & Heal ──────────────────────────────────────────────────

  registerEffectHandler(EFFECT_KIND.DAMAGE_FLAT, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    const amount = ctx.effect.value ?? 0;
    if (amount <= 0) return;

    // Use the pipeline from the world
    const result = ctx.world.sim.pipeline.applyDamage(
      ctx.world,
      ctx.sourceEid,
      ctx.targetEid,
      amount,
      DAMAGE_TYPE.PHYSICAL, // Default, can be overridden by payload if we extended it
      DAMAGE_FLAGS.NONE
    );

    ctx.result = result.amount;
  });

  registerEffectHandler(EFFECT_KIND.HEAL_FLAT, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    const amount = ctx.effect.value ?? 0;
    if (amount <= 0) return;

    const result = ctx.world.sim.pipeline.applyHeal(ctx.world, ctx.sourceEid, ctx.targetEid, amount);

    ctx.result = result.actualHealed;
  });

  registerEffectHandler(EFFECT_KIND.APPLY_BUFF, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY && ctx.stage !== EFFECT_STAGE.ON_REFRESH) return;

    const duration = ctx.effect.duration ?? 5;
    const power = ctx.effect.power ?? 1.5; // Default 50% increase

    // 1. Visual/Legacy Compat
    StatusEffects.buffTimer[ctx.targetEid] = Math.max(StatusEffects.buffTimer[ctx.targetEid], duration);
    StatusEffects.buffPower[ctx.targetEid] = Math.max(StatusEffects.buffPower[ctx.targetEid], power);

    // 2. Active Effect (Duration Logic)
    // Only create if ON_APPLY, otherwise refresh?
    // ActiveEffectsSystem handles ticking, but we need to ensure we don't duplicate.
    // For now, let's assume specific buffs are unique by ID or Kind.
    // Simple approach: Add stat modifier.

    // 3. Stat Modifiers
    // Remove existing buff modifiers first? Or stack?
    // Let's assume non-stacking for simple "buff" kind for now.
    statModifierStore.removeByTag(ctx.targetEid, "buff_generic");

    // Add Attack Damage Modifier
    // Calculate percentage increase: power 1.5 means +50%
    const percentAdd = power - 1;
    if (percentAdd > 0) {
      statModifierStore.add(ctx.targetEid, {
        stat: STAT.ATTACK_DAMAGE,
        type: MODIFIER_TYPE.PERCENT_ADD,
        value: percentAdd,
        sourceEid: ctx.sourceEid,
        duration: duration,
        tag: "buff_generic"
      });
    }
  });

  registerEffectHandler(EFFECT_KIND.TRIGGER_ON_HIT, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;
    // Placeholder for future logic
  });

  // ── Status Effects ─────────────────────────────────────────────────

  registerEffectHandler(EFFECT_KIND.APPLY_STUN, (ctx: EffectContext) => {
    if (ctx.stage === EFFECT_STAGE.ON_APPLY || ctx.stage === EFFECT_STAGE.ON_REFRESH) {
      const duration = ctx.effect.duration ?? 0;
      StatusEffects.stunTimer[ctx.targetEid] = Math.max(StatusEffects.stunTimer[ctx.targetEid], duration);
      // We could also add a "STUNNED" tag or modifier here if needed
    }
  });

  registerEffectHandler(EFFECT_KIND.APPLY_SLOW, (ctx: EffectContext) => {
    if (ctx.stage === EFFECT_STAGE.ON_APPLY || ctx.stage === EFFECT_STAGE.ON_REFRESH) {
      const duration = ctx.effect.duration ?? 0;
      const power = ctx.effect.power ?? 0.5; // Default 50% slow (0.5 multiplier)

      // 1. Visual/Legacy Compat
      if (power <= StatusEffects.slowPower[ctx.targetEid] || StatusEffects.slowTimer[ctx.targetEid] <= 0) {
        StatusEffects.slowPower[ctx.targetEid] = power;
      }
      StatusEffects.slowTimer[ctx.targetEid] = Math.max(StatusEffects.slowTimer[ctx.targetEid], duration);

      // 2. Stat Modifiers
      // Remove existing slow modifiers
      statModifierStore.removeByTag(ctx.targetEid, "slow_generic");

      // Move Speed Modifier (Multiplicative)
      // power 0.5 means 50% speed. So we multiply by 0.5.
      // Stats system uses (1 + percentAdd) * percentMult.
      // We can use percentMult = power.
      statModifierStore.add(ctx.targetEid, {
        stat: STAT.MOVE_SPEED,
        type: MODIFIER_TYPE.PERCENT_MULT,
        value: power,
        sourceEid: ctx.sourceEid,
        duration: duration,
        tag: "slow_generic"
      });

      // Attack Speed Slow? Often slows affect AS too. Let's assume just Move Speed for now unless specified.
    }
  });

  // ── Resources ──────────────────────────────────────────────────────

  registerEffectHandler(EFFECT_KIND.RESTORE_MANA, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;
    const amount = ctx.effect.value ?? 0;
    ctx.result = restoreResource(ctx.targetEid, amount);
  });

  registerEffectHandler(EFFECT_KIND.DRAIN_MANA, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;
    const amount = ctx.effect.value ?? 0;
    const result = spendResource(ctx.targetEid, amount);
    ctx.result = result.spent;
  });

  registerEffectHandler(EFFECT_KIND.ADD_STACKS, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;
    const count = ctx.effect.stacks ?? 1;
    ctx.result = addStacks(ctx.targetEid, count);
  });

  // ── Movement ───────────────────────────────────────────────────────

  registerEffectHandler(EFFECT_KIND.PUSHBACK, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    const distance = ctx.effect.value ?? 50;
    const duration = ctx.effect.duration ?? 0.2;
    const sourceX = Position.x[ctx.sourceEid];

    applyKnockback(ctx.targetEid, sourceX, distance, duration);
  });

  registerEffectHandler(EFFECT_KIND.PULL, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    const distance = ctx.effect.value ?? 50;
    const duration = ctx.effect.duration ?? 0.2;

    applyPull(ctx.targetEid, ctx.sourceEid, distance, duration);
  });

  registerEffectHandler(EFFECT_KIND.DASH, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    const speed = ctx.effect.power ?? 300;
    const targetX = ctx.effect.value ?? Position.x[ctx.targetEid];

    startDash(ctx.targetEid, targetX, speed);
  });

  registerEffectHandler(EFFECT_KIND.BLINK, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;
    const targetX = ctx.effect.value ?? Position.x[ctx.targetEid];
    blink(ctx.targetEid, targetX);
  });

  // ── Mark & Stacks ──────────────────────────────────────────────────

  registerEffectHandler(EFFECT_KIND.CONSUME_MARK, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    // id is required to find the mark
    if (!ctx.effect.id) return;

    // Look for active effect with this ID
    const effect = activeEffectsStore.findById(ctx.targetEid, ctx.effect.id);
    if (!effect) return;

    // Found it. Consume it (remove it).
    activeEffectsStore.remove(ctx.targetEid, effect.instanceId);

    // Return 1 to indicate success
    ctx.result = 1;
  });

  registerEffectHandler(EFFECT_KIND.CONSUME_STACKS, (ctx: EffectContext) => {
    if (ctx.stage !== EFFECT_STAGE.ON_APPLY) return;

    // id is required
    if (!ctx.effect.id) return;

    const effect = activeEffectsStore.findById(ctx.targetEid, ctx.effect.id);
    if (!effect) return;

    const stacksToConsume = ctx.effect.stacks ?? 1;
    const consumed = consumeEffectStacks(effect, stacksToConsume);

    // If stacks reach 0, remove effect
    if (effect.stacks <= 0) {
      activeEffectsStore.remove(ctx.targetEid, effect.instanceId);
    }

    ctx.result = consumed;
  });
}
