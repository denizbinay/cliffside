/**
 * Shield system for absorbing damage.
 *
 * Shields have:
 * - Amount (HP value)
 * - Duration (optional expiration)
 * - Type (normal, magic-only, physical-only)
 * - Priority (for consumption order)
 */

import type { DamageType } from "./DamageTypes";
import { DAMAGE_TYPE } from "./DamageTypes";

// ── Shield Types ─────────────────────────────────────────────────────

export const SHIELD_ABSORB = {
  ALL: "all",
  PHYSICAL: "physical",
  MAGIC: "magic"
} as const;

export type ShieldAbsorbType = (typeof SHIELD_ABSORB)[keyof typeof SHIELD_ABSORB];

export interface Shield {
  /** Unique instance ID. */
  id: number;
  /** Current shield amount. */
  amount: number;
  /** Maximum shield amount (for display). */
  maxAmount: number;
  /** What damage types this shield blocks. */
  absorbs: ShieldAbsorbType;
  /** Entity that granted the shield. */
  sourceEid: number;
  /** Remaining duration (-1 for permanent until broken). */
  duration: number;
  /** Priority for consumption order (higher = consumed first). */
  priority: number;
  /** Optional tag for grouping. */
  tag?: string;
}

// ── Shield Store ─────────────────────────────────────────────────────

let nextShieldId = 1;

class ShieldStore {
  private shields = new Map<number, Shield[]>();

  get(eid: number): Shield[] {
    return this.shields.get(eid) ?? [];
  }

  add(eid: number, shield: Omit<Shield, "id">): Shield {
    const list = this.shields.get(eid) ?? [];
    const fullShield: Shield = { ...shield, id: nextShieldId++ };
    list.push(fullShield);
    // Sort by priority (descending) for consumption order
    list.sort((a, b) => b.priority - a.priority);
    this.shields.set(eid, list);
    return fullShield;
  }

  remove(eid: number, shieldId: number): boolean {
    const list = this.shields.get(eid);
    if (!list) return false;
    const idx = list.findIndex((s) => s.id === shieldId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  removeByTag(eid: number, tag: string): number {
    const list = this.shields.get(eid);
    if (!list) return 0;
    const before = list.length;
    const filtered = list.filter((s) => s.tag !== tag);
    this.shields.set(eid, filtered);
    return before - filtered.length;
  }

  clearEntity(eid: number): void {
    this.shields.delete(eid);
  }

  clear(): void {
    this.shields.clear();
    nextShieldId = 1;
  }

  /** Get total shield amount for display. */
  getTotalShield(eid: number): number {
    const list = this.shields.get(eid);
    if (!list) return 0;
    return list.reduce((sum, s) => sum + s.amount, 0);
  }

  entities(): IterableIterator<number> {
    return this.shields.keys();
  }

  /** Tick shields, removing expired ones. */
  tick(eid: number, delta: number): void {
    const list = this.shields.get(eid);
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const shield = list[i];
      if (shield.duration < 0) continue; // permanent
      shield.duration -= delta;
      if (shield.duration <= 0) {
        list.splice(i, 1);
      }
    }
  }
}

export const shieldStore = new ShieldStore();

// ── Shield Operations ────────────────────────────────────────────────

/**
 * Check if a shield can absorb a damage type.
 */
function canAbsorb(shield: Shield, damageType: DamageType): boolean {
  switch (shield.absorbs) {
    case SHIELD_ABSORB.ALL:
      return true;
    case SHIELD_ABSORB.PHYSICAL:
      return damageType === DAMAGE_TYPE.PHYSICAL;
    case SHIELD_ABSORB.MAGIC:
      return damageType === DAMAGE_TYPE.MAGIC;
    default:
      return false;
  }
}

export interface AbsorbResult {
  absorbed: number;
  remaining: number;
  shieldsBroken: number;
}

/**
 * Absorb damage with shields. Returns damage remaining after absorption.
 */
export function absorbDamage(eid: number, damage: number, damageType: DamageType): AbsorbResult {
  const shields = shieldStore.get(eid);
  let remaining = damage;
  let absorbed = 0;
  let shieldsBroken = 0;

  // Shields are pre-sorted by priority
  for (let i = 0; i < shields.length && remaining > 0; i++) {
    const shield = shields[i];
    if (!canAbsorb(shield, damageType)) continue;

    const toAbsorb = Math.min(shield.amount, remaining);
    shield.amount -= toAbsorb;
    remaining -= toAbsorb;
    absorbed += toAbsorb;

    if (shield.amount <= 0) {
      shields.splice(i, 1);
      i--;
      shieldsBroken++;
    }
  }

  return { absorbed, remaining, shieldsBroken };
}

/**
 * Create a basic shield.
 */
export function createShield(
  eid: number,
  sourceEid: number,
  amount: number,
  duration: number = -1,
  absorbs: ShieldAbsorbType = SHIELD_ABSORB.ALL,
  priority: number = 0,
  tag?: string
): Shield {
  return shieldStore.add(eid, {
    amount,
    maxAmount: amount,
    absorbs,
    sourceEid,
    duration,
    priority,
    tag
  });
}
