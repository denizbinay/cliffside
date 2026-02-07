/**
 * Stats system for offense, defense, and utility modifiers.
 *
 * This provides a unified way to compute effective stats with support for:
 * - Base values (from unit config)
 * - Flat modifiers (additive)
 * - Percent modifiers (multiplicative)
 * - Timed modifiers with source tracking
 */

import type { GameWorld } from "../ecs/world";

// ── Stat Keys ────────────────────────────────────────────────────────

export const STAT = {
  // Offense
  ATTACK_DAMAGE: "attackDamage",
  ABILITY_POWER: "abilityPower",
  ATTACK_SPEED: "attackSpeed",
  CRIT_CHANCE: "critChance",
  CRIT_DAMAGE: "critDamage",
  ARMOR_PEN: "armorPen",
  MAGIC_PEN: "magicPen",
  LETHALITY: "lethality",
  LIFESTEAL: "lifesteal",
  OMNIVAMP: "omnivamp",

  // Defense
  ARMOR: "armor",
  MAGIC_RESIST: "magicResist",
  DAMAGE_REDUCTION: "damageReduction",
  HEAL_POWER: "healPower",
  HEAL_RECEIVED: "healReceived",
  TENACITY: "tenacity",
  SLOW_RESIST: "slowResist",

  // Utility
  MOVE_SPEED: "moveSpeed",
  ABILITY_HASTE: "abilityHaste",
  RANGE: "range"
} as const;

export type StatKey = (typeof STAT)[keyof typeof STAT];

// ── Modifier Types ───────────────────────────────────────────────────

export const MODIFIER_TYPE = {
  FLAT: "flat",
  PERCENT_ADD: "percentAdd",
  PERCENT_MULT: "percentMult"
} as const;

export type ModifierType = (typeof MODIFIER_TYPE)[keyof typeof MODIFIER_TYPE];

export interface StatModifier {
  /** Unique ID for this modifier instance. */
  id: number;
  /** The stat being modified. */
  stat: StatKey;
  /** How the modifier is applied. */
  type: ModifierType;
  /** The modifier value. */
  value: number;
  /** Source entity that applied this modifier. */
  sourceEid: number;
  /** Remaining duration in seconds (-1 for permanent). */
  duration: number;
  /** Optional string tag for grouping/removal. */
  tag?: string;
}

// ── Modifier Store ───────────────────────────────────────────────────

let nextModifierId = 1;

class StatModifierStore {
  private modifiers = new Map<number, StatModifier[]>();

  get(eid: number): StatModifier[] {
    return this.modifiers.get(eid) ?? [];
  }

  add(eid: number, mod: Omit<StatModifier, "id">): StatModifier {
    const list = this.modifiers.get(eid) ?? [];
    const fullMod: StatModifier = { ...mod, id: nextModifierId++ };
    list.push(fullMod);
    this.modifiers.set(eid, list);
    return fullMod;
  }

  remove(eid: number, modId: number): boolean {
    const list = this.modifiers.get(eid);
    if (!list) return false;
    const idx = list.findIndex((m) => m.id === modId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  removeByTag(eid: number, tag: string): number {
    const list = this.modifiers.get(eid);
    if (!list) return 0;
    const before = list.length;
    const filtered = list.filter((m) => m.tag !== tag);
    this.modifiers.set(eid, filtered);
    return before - filtered.length;
  }

  removeBySource(eid: number, sourceEid: number): number {
    const list = this.modifiers.get(eid);
    if (!list) return 0;
    const before = list.length;
    const filtered = list.filter((m) => m.sourceEid !== sourceEid);
    this.modifiers.set(eid, filtered);
    return before - filtered.length;
  }

  clearEntity(eid: number): void {
    this.modifiers.delete(eid);
  }

  clear(): void {
    this.modifiers.clear();
    nextModifierId = 1;
  }

  entities(): IterableIterator<number> {
    return this.modifiers.keys();
  }

  /** Tick all modifiers for an entity, removing expired ones. */
  tick(eid: number, delta: number): void {
    const list = this.modifiers.get(eid);
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const mod = list[i];
      if (mod.duration < 0) continue; // permanent
      mod.duration -= delta;
      if (mod.duration <= 0) {
        list.splice(i, 1);
      }
    }
  }
}

export const statModifierStore = new StatModifierStore();

// ── Stat Calculation ─────────────────────────────────────────────────

export interface StatCalcResult {
  base: number;
  flatBonus: number;
  percentAdd: number;
  percentMult: number;
  final: number;
}

/**
 * Calculate effective stat value with all modifiers.
 * Formula: (base + flatBonus) * (1 + percentAdd) * percentMult
 */
export function calculateStat(eid: number, stat: StatKey, base: number): StatCalcResult {
  const mods = statModifierStore.get(eid).filter((m) => m.stat === stat);

  let flatBonus = 0;
  let percentAdd = 0;
  let percentMult = 1;

  for (const mod of mods) {
    switch (mod.type) {
      case MODIFIER_TYPE.FLAT:
        flatBonus += mod.value;
        break;
      case MODIFIER_TYPE.PERCENT_ADD:
        percentAdd += mod.value;
        break;
      case MODIFIER_TYPE.PERCENT_MULT:
        percentMult *= mod.value;
        break;
    }
  }

  const final = (base + flatBonus) * (1 + percentAdd) * percentMult;

  return { base, flatBonus, percentAdd, percentMult, final };
}

/**
 * Quick helper to get final stat value.
 */
export function getStat(eid: number, stat: StatKey, base: number): number {
  return calculateStat(eid, stat, base).final;
}

// ── Defense Calculations ─────────────────────────────────────────────

/**
 * Calculate damage reduction from armor/MR.
 * Uses League-style formula: reduction = armor / (100 + armor)
 */
export function calculateArmorReduction(armor: number): number {
  if (armor >= 0) {
    return armor / (100 + armor);
  }
  // Negative armor = damage amplification
  return 2 - 100 / (100 - armor);
}

/**
 * Apply armor to damage.
 */
export function applyArmorToDamage(damage: number, armor: number): number {
  const reduction = calculateArmorReduction(armor);
  return damage * (1 - reduction);
}

/**
 * Calculate effective armor after penetration.
 */
export function calculateEffectiveArmor(baseArmor: number, lethality: number, percentPen: number): number {
  // Flat pen (lethality) then percent pen
  const afterFlat = baseArmor - lethality;
  return afterFlat * (1 - percentPen);
}
