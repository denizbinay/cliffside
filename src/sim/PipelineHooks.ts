/**
 * Pipeline hooks for integrating shields, armor, and stats into damage calculation.
 *
 * Register these hooks on world initialization to enable:
 * - Armor/MR damage reduction
 * - Shield absorption
 * - Penetration calculations
 * - Lifesteal
 * - Anti-heal
 */

import type { DamagePipeline, DamageContext, HealContext } from "./DamagePipeline";
import { DAMAGE_FLAGS } from "./DamagePipeline";
import { DAMAGE_TYPE } from "./DamageTypes";
import { STAT, getStat, calculateEffectiveArmor, applyArmorToDamage, statModifierStore } from "./Stats";
import { absorbDamage, shieldStore } from "./Shields";
import { emitCombat, SIM_EVENT } from "./SimEventBus";

/**
 * Register core mitigation hooks on a damage pipeline.
 */
export function registerCorePipelineHooks(pipeline: DamagePipeline): void {
  // ── Pre-Mitigation Hooks ─────────────────────────────────────────

  // Execute scaling (bonus damage to low-HP targets)
  pipeline.onDamage("preMitigation", (ctx: DamageContext) => {
    if (!(ctx.flags & DAMAGE_FLAGS.EXECUTE)) return;

    const targetHpRatio = ctx.previousHp / (ctx.previousHp + ctx.amount);
    if (targetHpRatio < 0.3) {
      // Bonus damage scaling based on missing HP
      const missingRatio = 1 - targetHpRatio;
      ctx.amount *= 1 + missingRatio * 0.5; // Up to 50% bonus at low HP
    }
  });

  // ── Mitigation Hooks ─────────────────────────────────────────────

  // Armor/MR calculation
  pipeline.onDamage("mitigation", (ctx: DamageContext) => {
    if (ctx.damageType === DAMAGE_TYPE.TRUE || ctx.damageType === DAMAGE_TYPE.PURE) {
      return; // True damage ignores armor
    }

    const stat = ctx.damageType === DAMAGE_TYPE.PHYSICAL ? STAT.ARMOR : STAT.MAGIC_RESIST;
    const penStat = ctx.damageType === DAMAGE_TYPE.PHYSICAL ? STAT.ARMOR_PEN : STAT.MAGIC_PEN;
    const lethalityStat = STAT.LETHALITY;

    // Get base defense
    const baseDef = getStat(ctx.targetEid, stat, 0);

    // Get penetration from attacker
    const percentPen = getStat(ctx.sourceEid, penStat, 0);
    const lethality = ctx.damageType === DAMAGE_TYPE.PHYSICAL ? getStat(ctx.sourceEid, lethalityStat, 0) : 0;

    // Calculate effective armor after penetration
    const effectiveArmor = calculateEffectiveArmor(baseDef, lethality, percentPen);

    // Apply damage reduction
    ctx.amount = applyArmorToDamage(ctx.amount, effectiveArmor);
  });

  // Flat damage reduction
  pipeline.onDamage("mitigation", (ctx: DamageContext) => {
    if (ctx.damageType === DAMAGE_TYPE.PURE) return;

    const reduction = getStat(ctx.targetEid, STAT.DAMAGE_REDUCTION, 0);
    if (reduction > 0) {
      ctx.amount = Math.max(0, ctx.amount - reduction);
    }
  });

  // Shield absorption (after other mitigation)
  pipeline.onDamage("mitigation", (ctx: DamageContext) => {
    const result = absorbDamage(ctx.targetEid, ctx.amount, ctx.damageType);
    ctx.shieldAbsorbed = result.absorbed;
    ctx.amount = result.remaining;

    // Emit shield break events
    if (result.shieldsBroken > 0) {
      // Shield break events would be emitted here
    }
  });

  // ── Post-Damage Hooks ────────────────────────────────────────────

  // Lifesteal
  pipeline.onDamage("postDamage", (ctx: DamageContext) => {
    if (ctx.damageType !== DAMAGE_TYPE.PHYSICAL) return;
    if (ctx.amount <= 0) return;

    const lifesteal = getStat(ctx.sourceEid, STAT.LIFESTEAL, 0);
    if (lifesteal <= 0) return;

    const healAmount = ctx.amount * lifesteal;
    if (healAmount > 0) {
      ctx.world.sim.pipeline.applyHeal(ctx.world, ctx.sourceEid, ctx.sourceEid, healAmount, ["lifesteal"]);
    }
  });

  // Omnivamp (all damage types)
  pipeline.onDamage("postDamage", (ctx: DamageContext) => {
    if (ctx.amount <= 0) return;

    const omnivamp = getStat(ctx.sourceEid, STAT.OMNIVAMP, 0);
    if (omnivamp <= 0) return;

    // AOE damage has reduced omnivamp
    const effectiveVamp = ctx.flags & DAMAGE_FLAGS.AOE ? omnivamp * 0.33 : omnivamp;
    const healAmount = ctx.amount * effectiveVamp;

    if (healAmount > 0) {
      ctx.world.sim.pipeline.applyHeal(ctx.world, ctx.sourceEid, ctx.sourceEid, healAmount, ["omnivamp"]);
    }
  });

  // ── On-Kill Hooks ────────────────────────────────────────────────

  // Death event emission
  pipeline.onDamage("onKill", (ctx: DamageContext) => {
    emitCombat(ctx.world, SIM_EVENT.KILL, ctx.sourceEid, ctx.targetEid, ctx.amount, ctx.damageType);
  });
}

/**
 * Register heal pipeline hooks.
 */
export function registerHealPipelineHooks(pipeline: DamagePipeline): void {
  // Anti-heal (Grievous Wounds)
  pipeline.onHeal("preHeal", (ctx: HealContext) => {
    const healReceived = getStat(ctx.targetEid, STAT.HEAL_RECEIVED, 1);
    ctx.amount *= healReceived;
  });

  // Heal power amplification
  pipeline.onHeal("preHeal", (ctx: HealContext) => {
    const healPower = getStat(ctx.sourceEid, STAT.HEAL_POWER, 1);
    ctx.amount *= healPower;
  });

  // Post-heal events
  pipeline.onHeal("postHeal", (ctx: HealContext) => {
    // Could emit heal events here
  });
}

/**
 * Initialize all core pipeline hooks.
 */
export function initializePipelineHooks(pipeline: DamagePipeline): void {
  registerCorePipelineHooks(pipeline);
  registerHealPipelineHooks(pipeline);
}
