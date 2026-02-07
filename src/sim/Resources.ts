/**
 * Resource system for mana, energy, charges, and health-cost abilities.
 *
 * Generic enough to support:
 * - Mana-based casters
 * - Energy-based assassins
 * - Charge-based abilities (Akali shroud, etc.)
 * - Health-cost abilities
 * - Fury/rage builders
 */

import type { GameWorld } from "../ecs/world";

// ── Resource Types ───────────────────────────────────────────────────

export const RESOURCE_TYPE = {
  NONE: "none",
  MANA: "mana",
  ENERGY: "energy",
  HEALTH: "health",
  FURY: "fury",
  CHARGE: "charge",
  STACK: "stack"
} as const;

export type ResourceType = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

// ── Resource Definition ──────────────────────────────────────────────

export interface ResourceDef {
  type: ResourceType;
  /** Maximum value (for mana/energy/fury). */
  max?: number;
  /** Regen per second. */
  regen?: number;
  /** For charge-based: max charges. */
  maxCharges?: number;
  /** For charge-based: recharge time per charge. */
  rechargeTime?: number;
  /** For stacks: maximum stacks. */
  maxStacks?: number;
  /** For stacks: decay time (seconds before losing a stack). */
  decayTime?: number;
  /** Whether decay removes all stacks or just one. */
  decayAll?: boolean;
}

// ── Resource State ───────────────────────────────────────────────────

export interface ResourceState {
  type: ResourceType;
  current: number;
  max: number;
  regen: number;
  /** For charge-based resources. */
  charges: number;
  maxCharges: number;
  rechargeTimer: number;
  rechargeTime: number;
  /** For stack-based resources. */
  stacks: number;
  maxStacks: number;
  decayTimer: number;
  decayTime: number;
  decayAll: boolean;
}

// ── Resource Store ───────────────────────────────────────────────────

class ResourceStore {
  private resources = new Map<number, ResourceState>();

  get(eid: number): ResourceState | undefined {
    return this.resources.get(eid);
  }

  set(eid: number, state: ResourceState): void {
    this.resources.set(eid, state);
  }

  init(eid: number, def: ResourceDef): ResourceState {
    const state: ResourceState = {
      type: def.type,
      current: def.max ?? 0,
      max: def.max ?? 0,
      regen: def.regen ?? 0,
      charges: def.maxCharges ?? 0,
      maxCharges: def.maxCharges ?? 0,
      rechargeTimer: 0,
      rechargeTime: def.rechargeTime ?? 0,
      stacks: 0,
      maxStacks: def.maxStacks ?? 0,
      decayTimer: 0,
      decayTime: def.decayTime ?? 0,
      decayAll: def.decayAll ?? false
    };
    this.resources.set(eid, state);
    return state;
  }

  remove(eid: number): void {
    this.resources.delete(eid);
  }

  clear(): void {
    this.resources.clear();
  }

  entities(): IterableIterator<number> {
    return this.resources.keys();
  }
}

export const resourceStore = new ResourceStore();

// ── Resource Operations ──────────────────────────────────────────────

export interface SpendResult {
  success: boolean;
  spent: number;
}

/**
 * Try to spend a resource. Returns whether spend succeeded.
 */
export function spendResource(eid: number, amount: number): SpendResult {
  const state = resourceStore.get(eid);
  if (!state) return { success: false, spent: 0 };

  switch (state.type) {
    case RESOURCE_TYPE.NONE:
      return { success: true, spent: 0 };

    case RESOURCE_TYPE.MANA:
    case RESOURCE_TYPE.ENERGY:
    case RESOURCE_TYPE.FURY:
      if (state.current >= amount) {
        state.current -= amount;
        return { success: true, spent: amount };
      }
      return { success: false, spent: 0 };

    case RESOURCE_TYPE.HEALTH:
      // Health cost always succeeds (can kill self)
      state.current = Math.max(0, state.current - amount);
      return { success: true, spent: amount };

    case RESOURCE_TYPE.CHARGE:
      if (state.charges >= amount) {
        state.charges -= amount;
        return { success: true, spent: amount };
      }
      return { success: false, spent: 0 };

    case RESOURCE_TYPE.STACK:
      if (state.stacks >= amount) {
        state.stacks -= amount;
        state.decayTimer = state.decayTime;
        return { success: true, spent: amount };
      }
      return { success: false, spent: 0 };

    default:
      return { success: false, spent: 0 };
  }
}

/**
 * Restore resource (mana/energy regen, etc.).
 */
export function restoreResource(eid: number, amount: number): number {
  const state = resourceStore.get(eid);
  if (!state) return 0;

  const before = state.current;
  state.current = Math.min(state.max, state.current + amount);
  return state.current - before;
}

/**
 * Add stacks to a stack-based resource.
 */
export function addStacks(eid: number, count: number): number {
  const state = resourceStore.get(eid);
  if (!state || state.type !== RESOURCE_TYPE.STACK) return 0;

  const before = state.stacks;
  state.stacks = Math.min(state.maxStacks, state.stacks + count);
  state.decayTimer = state.decayTime;
  return state.stacks - before;
}

/**
 * Add fury/rage.
 */
export function addFury(eid: number, amount: number): number {
  const state = resourceStore.get(eid);
  if (!state || state.type !== RESOURCE_TYPE.FURY) return 0;

  const before = state.current;
  state.current = Math.min(state.max, state.current + amount);
  return state.current - before;
}

/**
 * Check if entity can afford a cost.
 */
export function canAfford(eid: number, cost: number): boolean {
  const state = resourceStore.get(eid);
  if (!state) return false;

  switch (state.type) {
    case RESOURCE_TYPE.NONE:
      return true;
    case RESOURCE_TYPE.MANA:
    case RESOURCE_TYPE.ENERGY:
    case RESOURCE_TYPE.FURY:
      return state.current >= cost;
    case RESOURCE_TYPE.HEALTH:
      return true; // Health cost always "affordable"
    case RESOURCE_TYPE.CHARGE:
      return state.charges >= cost;
    case RESOURCE_TYPE.STACK:
      return state.stacks >= cost;
    default:
      return false;
  }
}

// ── Resource Tick ────────────────────────────────────────────────────

/**
 * Tick resource regen/recharge/decay.
 */
export function tickResource(eid: number, delta: number): void {
  const state = resourceStore.get(eid);
  if (!state) return;

  switch (state.type) {
    case RESOURCE_TYPE.MANA:
    case RESOURCE_TYPE.ENERGY:
      // Regen
      if (state.regen > 0 && state.current < state.max) {
        state.current = Math.min(state.max, state.current + state.regen * delta);
      }
      break;

    case RESOURCE_TYPE.FURY:
      // Fury decays when out of combat (caller handles trigger)
      break;

    case RESOURCE_TYPE.CHARGE:
      // Recharge timer
      if (state.charges < state.maxCharges && state.rechargeTime > 0) {
        state.rechargeTimer += delta;
        while (state.rechargeTimer >= state.rechargeTime && state.charges < state.maxCharges) {
          state.rechargeTimer -= state.rechargeTime;
          state.charges++;
        }
      }
      break;

    case RESOURCE_TYPE.STACK:
      // Stack decay
      if (state.stacks > 0 && state.decayTime > 0) {
        state.decayTimer -= delta;
        if (state.decayTimer <= 0) {
          if (state.decayAll) {
            state.stacks = 0;
          } else {
            state.stacks--;
            if (state.stacks > 0) {
              state.decayTimer = state.decayTime;
            }
          }
        }
      }
      break;
  }
}
