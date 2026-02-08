/**
 * Targeting eligibility and visibility system.
 *
 * Provides a unified layer for determining if a target is valid:
 * - Alive check
 * - Targetable (not untargetable)
 * - Visible (not camouflaged/invisible)
 * - In range
 * - Faction rules
 * - Immunity flags
 */

import { Health } from "../ecs/components/Health";
import { Faction } from "../ecs/components/Faction";
import { Position } from "../ecs/components/Position";

// ── Targeting Flags ──────────────────────────────────────────────────

export const TARGET_FLAG = {
  NONE: 0,
  UNTARGETABLE: 1 << 0,
  INVULNERABLE: 1 << 1,
  INVISIBLE: 1 << 2,
  CAMOUFLAGED: 1 << 3,
  REVEALED: 1 << 4,
  GHOST: 1 << 5, // can pass through units
  SPELL_IMMUNE: 1 << 6,
  ATTACK_IMMUNE: 1 << 7
} as const;

export type TargetFlags = number;

// Combos
export const TARGET_STATE = {
  ...TARGET_FLAG,
  HIDDEN: TARGET_FLAG.INVISIBLE | TARGET_FLAG.CAMOUFLAGED,
  IMMUNE: TARGET_FLAG.UNTARGETABLE | TARGET_FLAG.INVULNERABLE
} as const;

// ── Visibility Model ─────────────────────────────────────────────────

export interface RevealSource {
  id: number;
  sourceEid: number;
  radius: number;
  x: number;
  y: number;
  duration: number;
  revealsCamouflage: boolean;
  revealsInvisible: boolean;
}

// ── Targeting Store ──────────────────────────────────────────────────

let nextRevealId = 1;

class TargetingStore {
  private flags = new Map<number, TargetFlags>();
  private reveals = new Map<number, RevealSource[]>();

  getFlags(eid: number): TargetFlags {
    return this.flags.get(eid) ?? TARGET_FLAG.NONE;
  }

  setFlags(eid: number, flags: TargetFlags): void {
    this.flags.set(eid, flags);
  }

  addFlag(eid: number, flag: TargetFlags): void {
    const current = this.flags.get(eid) ?? TARGET_FLAG.NONE;
    this.flags.set(eid, current | flag);
  }

  removeFlag(eid: number, flag: TargetFlags): void {
    const current = this.flags.get(eid) ?? TARGET_FLAG.NONE;
    this.flags.set(eid, current & ~flag);
  }

  hasFlag(eid: number, flag: TargetFlags): boolean {
    const current = this.flags.get(eid) ?? TARGET_FLAG.NONE;
    return (current & flag) !== 0;
  }

  // Reveal sources
  addReveal(reveal: Omit<RevealSource, "id">): RevealSource {
    const fullReveal: RevealSource = { ...reveal, id: nextRevealId++ };
    const list = this.reveals.get(reveal.sourceEid) ?? [];
    list.push(fullReveal);
    this.reveals.set(reveal.sourceEid, list);
    return fullReveal;
  }

  getReveals(): RevealSource[] {
    const all: RevealSource[] = [];
    for (const list of this.reveals.values()) {
      all.push(...list);
    }
    return all;
  }

  tickReveals(delta: number): void {
    for (const [sourceEid, list] of this.reveals) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].duration -= delta;
        if (list[i].duration <= 0) {
          list.splice(i, 1);
        }
      }
    }
  }

  clear(): void {
    this.flags.clear();
    this.reveals.clear();
    nextRevealId = 1;
  }

  clearEntity(eid: number): void {
    this.flags.delete(eid);
    this.reveals.delete(eid);
  }
}

export const targetingStore = new TargetingStore();

// ── Eligibility Checks ───────────────────────────────────────────────

export interface EligibilityContext {
  sourceEid: number;
  targetEid: number;
  sourceX: number;
  sourceY: number;
  maxRange: number;
  requiresVision: boolean;
  isSpell: boolean;
  isAttack: boolean;
  ignoreFaction: boolean;
  sourceRadius?: number;
  targetRadius?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?:
    | "dead"
    | "untargetable"
    | "invulnerable"
    | "invisible"
    | "out_of_range"
    | "same_faction"
    | "spell_immune"
    | "attack_immune";
}

/**
 * Check if a target is valid for an action.
 */
export function checkEligibility(ctx: EligibilityContext): EligibilityResult {
  const targetFlags = targetingStore.getFlags(ctx.targetEid);

  // Dead check
  if (Health.current[ctx.targetEid] <= 0) {
    return { eligible: false, reason: "dead" };
  }

  // Untargetable
  if (targetFlags & TARGET_FLAG.UNTARGETABLE) {
    return { eligible: false, reason: "untargetable" };
  }

  // Invulnerable (can target but no damage)
  // Note: We don't block targeting for invulnerable, just damage

  // Spell immunity
  if (ctx.isSpell && targetFlags & TARGET_FLAG.SPELL_IMMUNE) {
    return { eligible: false, reason: "spell_immune" };
  }

  // Attack immunity
  if (ctx.isAttack && targetFlags & TARGET_FLAG.ATTACK_IMMUNE) {
    return { eligible: false, reason: "attack_immune" };
  }

  // Visibility check
  if (ctx.requiresVision) {
    const hidden = targetFlags & TARGET_STATE.HIDDEN;
    const revealed = targetFlags & TARGET_FLAG.REVEALED;
    if (hidden && !revealed) {
      // Check reveal sources
      if (!isRevealedAt(ctx.targetEid, Position.x[ctx.targetEid], Position.y[ctx.targetEid])) {
        return { eligible: false, reason: "invisible" };
      }
    }
  }

  // Range check
  if (ctx.maxRange > 0) {
    const dx = Position.x[ctx.targetEid] - ctx.sourceX;
    const dy = Position.y[ctx.targetEid] - ctx.sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let effectiveRange = ctx.maxRange;
    if (ctx.isAttack) {
      const srcR = ctx.sourceRadius || 0;
      const tgtR = ctx.targetRadius || 0;
      effectiveRange += srcR + tgtR;
    }

    if (dist > effectiveRange) {
      return { eligible: false, reason: "out_of_range" };
    }
  }

  // Faction check
  if (!ctx.ignoreFaction) {
    const sourceFaction = Faction.value[ctx.sourceEid];
    const targetFaction = Faction.value[ctx.targetEid];
    if (sourceFaction === targetFaction) {
      return { eligible: false, reason: "same_faction" };
    }
  }

  return { eligible: true };
}

/**
 * Check if position is revealed by any source.
 */
function isRevealedAt(eid: number, x: number, y: number): boolean {
  const flags = targetingStore.getFlags(eid);
  const isCamo = (flags & TARGET_FLAG.CAMOUFLAGED) !== 0;
  const isInvis = (flags & TARGET_FLAG.INVISIBLE) !== 0;

  for (const reveal of targetingStore.getReveals()) {
    const dx = x - reveal.x;
    const dy = y - reveal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > reveal.radius) continue;

    if (isInvis && reveal.revealsInvisible) return true;
    if (isCamo && reveal.revealsCamouflage) return true;
  }

  return false;
}

/**
 * Simple helper for 1D games.
 */
export function isTargetableEnemy(sourceEid: number, targetEid: number, range: number): boolean {
  const result = checkEligibility({
    sourceEid,
    targetEid,
    sourceX: Position.x[sourceEid],
    sourceY: Position.y[sourceEid],
    maxRange: range,
    requiresVision: true,
    isSpell: false,
    isAttack: true,
    ignoreFaction: false
  });
  return result.eligible;
}

/**
 * Check if target is alive and in range (basic check).
 */
export function isAliveInRange(sourceEid: number, targetEid: number, range: number): boolean {
  if (Health.current[targetEid] <= 0) return false;
  // This is a quick check, ideally it would also use radii but it's used for AI movement checks mostly
  const dx = Position.x[targetEid] - Position.x[sourceEid];
  return Math.abs(dx) <= range;
}
