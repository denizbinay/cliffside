/**
 * Action/Cast state machine for abilities.
 *
 * Supports:
 * - Windup/channel phases
 * - Release/execution
 * - Recovery/backswing
 * - Interrupts and immunity
 * - Reset mechanics
 */

import type { GameWorld } from "../ecs/world";

import type { EffectDef } from "./EffectSystem";

// ── Action States ────────────────────────────────────────────────────

export const ACTION_STATE = {
  IDLE: "idle",
  WINDUP: "windup",
  CHANNEL: "channel",
  RELEASE: "release",
  RECOVERY: "recovery"
} as const;

export type ActionState = (typeof ACTION_STATE)[keyof typeof ACTION_STATE];

// ── Interrupt Types ──────────────────────────────────────────────────

export const INTERRUPT_TYPE = {
  NONE: 0,
  STUN: 1 << 0,
  SILENCE: 1 << 1,
  DISARM: 1 << 2,
  ROOT: 1 << 3,
  SUPPRESS: 1 << 4,
  KNOCKUP: 1 << 5,
  KNOCKBACK: 1 << 6,
  PULL: 1 << 7,
  FEAR: 1 << 8,
  CHARM: 1 << 9,
  TAUNT: 1 << 10,
  BLIND: 1 << 11,
  GROUND: 1 << 12 // prevents dashes
} as const;

export type InterruptFlags = number;

// Combos
export const INTERRUPT = {
  ...INTERRUPT_TYPE,
  HARD_CC:
    INTERRUPT_TYPE.STUN |
    INTERRUPT_TYPE.SUPPRESS |
    INTERRUPT_TYPE.KNOCKUP |
    INTERRUPT_TYPE.CHARM |
    INTERRUPT_TYPE.FEAR |
    INTERRUPT_TYPE.TAUNT,
  DISPLACEMENT: INTERRUPT_TYPE.KNOCKUP | INTERRUPT_TYPE.KNOCKBACK | INTERRUPT_TYPE.PULL,
  SOFT_CC: INTERRUPT_TYPE.SILENCE | INTERRUPT_TYPE.DISARM | INTERRUPT_TYPE.ROOT | INTERRUPT_TYPE.BLIND
} as const;

// ── Ability Flags ────────────────────────────────────────────────────

export const ABILITY_FLAG = {
  NONE: 0,
  UNSTOPPABLE: 1 << 0, // immune to all CC during cast
  UNINTERRUPTIBLE: 1 << 1, // can't be interrupted but still affected
  SPELL: 1 << 2, // counts as spell (can be silenced)
  ATTACK: 1 << 3, // counts as attack (can be disarmed)
  MOBILITY: 1 << 4, // counts as mobility (can be grounded)
  EMPOWERED: 1 << 5, // next-cast buff is active
  CHARGED: 1 << 6, // charged ability in progress
  RECASTABLE: 1 << 7 // has active recast window
} as const;

export type AbilityFlags = number;

// ── Action Definition ────────────────────────────────────────────────

export interface ActionDef {
  /** Unique ability ID. */
  id: string;
  /** Windup time in seconds (0 = instant). */
  windup: number;
  /** Channel time (0 = not channeled). */
  channel: number;
  /** Recovery time (backswing). */
  recovery: number;
  /** Cooldown after completion. */
  cooldown: number;
  /** What CC types interrupt this action. */
  interruptedBy: InterruptFlags;
  /** Ability flags. */
  flags: AbilityFlags;
  /** Resource cost. */
  cost: number;
  /** Effects to apply on release (optional). */
  onRelease?: EffectDef[];
}

// ── Action Instance ──────────────────────────────────────────────────

export interface ActionInstance {
  /** The action definition. */
  def: ActionDef;
  /** Current state. */
  state: ActionState;
  /** Time remaining in current state. */
  stateTimer: number;
  /** Target entity (if any). */
  targetEid: number;
  /** Target position (if any). */
  targetX?: number;
  targetY?: number;
  /** Tick when action started. */
  startTick: number;
  /** Whether action was interrupted. */
  interrupted: boolean;
  /** Interrupt type that cancelled this action. */
  interruptType: InterruptFlags;
}

// ── Action Store ─────────────────────────────────────────────────────

class ActionStore {
  private actions = new Map<number, ActionInstance>();
  private cooldowns = new Map<number, Map<string, number>>();

  getAction(eid: number): ActionInstance | undefined {
    return this.actions.get(eid);
  }

  setAction(eid: number, action: ActionInstance): void {
    this.actions.set(eid, action);
  }

  clearAction(eid: number): void {
    this.actions.delete(eid);
  }

  isIdle(eid: number): boolean {
    const action = this.actions.get(eid);
    return !action || action.state === ACTION_STATE.IDLE;
  }

  getCooldown(eid: number, abilityId: string): number {
    return this.cooldowns.get(eid)?.get(abilityId) ?? 0;
  }

  setCooldown(eid: number, abilityId: string, duration: number): void {
    let entityCds = this.cooldowns.get(eid);
    if (!entityCds) {
      entityCds = new Map();
      this.cooldowns.set(eid, entityCds);
    }
    entityCds.set(abilityId, duration);
  }

  tickCooldowns(eid: number, delta: number): void {
    const entityCds = this.cooldowns.get(eid);
    if (!entityCds) return;
    for (const [id, cd] of entityCds) {
      if (cd > 0) {
        entityCds.set(id, Math.max(0, cd - delta));
      }
    }
  }

  isOnCooldown(eid: number, abilityId: string): boolean {
    return this.getCooldown(eid, abilityId) > 0;
  }

  resetCooldown(eid: number, abilityId: string): void {
    this.cooldowns.get(eid)?.delete(abilityId);
  }

  reduceCooldown(eid: number, abilityId: string, amount: number): void {
    const entityCds = this.cooldowns.get(eid);
    if (!entityCds) return;
    const current = entityCds.get(abilityId) ?? 0;
    entityCds.set(abilityId, Math.max(0, current - amount));
  }

  clear(): void {
    this.actions.clear();
    this.cooldowns.clear();
  }

  clearEntity(eid: number): void {
    this.actions.delete(eid);
    this.cooldowns.delete(eid);
  }
}

export const actionStore = new ActionStore();

// ── Action Lifecycle ─────────────────────────────────────────────────

export interface StartActionResult {
  success: boolean;
  reason?: "on_cooldown" | "already_casting" | "no_resource" | "interrupted";
}

/**
 * Begin casting an action.
 */
export function startAction(
  eid: number,
  def: ActionDef,
  targetEid: number,
  tick: number,
  targetX?: number,
  targetY?: number
): StartActionResult {
  // Check cooldown
  if (actionStore.isOnCooldown(eid, def.id)) {
    return { success: false, reason: "on_cooldown" };
  }

  // Check if already casting
  if (!actionStore.isIdle(eid)) {
    return { success: false, reason: "already_casting" };
  }

  // Create action instance
  const instance: ActionInstance = {
    def,
    state: def.windup > 0 ? ACTION_STATE.WINDUP : ACTION_STATE.RELEASE,
    stateTimer: def.windup > 0 ? def.windup : 0,
    targetEid,
    targetX,
    targetY,
    startTick: tick,
    interrupted: false,
    interruptType: 0
  };

  actionStore.setAction(eid, instance);
  return { success: true };
}

export interface TickActionResult {
  /** Whether action is still in progress. */
  active: boolean;
  /** Whether release phase just started (trigger effect). */
  released: boolean;
  /** Whether action completed naturally. */
  completed: boolean;
  /** Whether action was interrupted. */
  interrupted: boolean;
}

/**
 * Tick an action through its states.
 */
export function tickAction(eid: number, delta: number): TickActionResult {
  const action = actionStore.getAction(eid);
  if (!action) {
    return { active: false, released: false, completed: false, interrupted: false };
  }

  const result: TickActionResult = {
    active: true,
    released: false,
    completed: false,
    interrupted: false
  };

  if (action.interrupted) {
    actionStore.clearAction(eid);
    return { active: false, released: false, completed: false, interrupted: true };
  }

  action.stateTimer -= delta;

  switch (action.state) {
    case ACTION_STATE.WINDUP:
      if (action.stateTimer <= 0) {
        action.state = ACTION_STATE.RELEASE;
        action.stateTimer = 0;
        result.released = true;
        // Immediately transition to channel or recovery
        if (action.def.channel > 0) {
          action.state = ACTION_STATE.CHANNEL;
          action.stateTimer = action.def.channel;
        } else if (action.def.recovery > 0) {
          action.state = ACTION_STATE.RECOVERY;
          action.stateTimer = action.def.recovery;
        } else {
          completeAction(eid, action);
          result.completed = true;
          result.active = false;
        }
      }
      break;

    case ACTION_STATE.CHANNEL:
      if (action.stateTimer <= 0) {
        if (action.def.recovery > 0) {
          action.state = ACTION_STATE.RECOVERY;
          action.stateTimer = action.def.recovery;
        } else {
          completeAction(eid, action);
          result.completed = true;
          result.active = false;
        }
      }
      break;

    case ACTION_STATE.RECOVERY:
      if (action.stateTimer <= 0) {
        completeAction(eid, action);
        result.completed = true;
        result.active = false;
      }
      break;

    case ACTION_STATE.RELEASE:
      // Instant release, should have transitioned already
      result.released = true;
      if (action.def.recovery > 0) {
        action.state = ACTION_STATE.RECOVERY;
        action.stateTimer = action.def.recovery;
      } else {
        completeAction(eid, action);
        result.completed = true;
        result.active = false;
      }
      break;
  }

  return result;
}

function completeAction(eid: number, action: ActionInstance): void {
  // Set cooldown
  if (action.def.cooldown > 0) {
    actionStore.setCooldown(eid, action.def.id, action.def.cooldown);
  }
  actionStore.clearAction(eid);
}

/**
 * Attempt to interrupt an action with CC.
 */
export function interruptAction(eid: number, ccType: InterruptFlags): boolean {
  const action = actionStore.getAction(eid);
  if (!action) return false;

  // Check if action is unstoppable
  if (action.def.flags & ABILITY_FLAG.UNSTOPPABLE) {
    return false;
  }

  // Check if this CC type can interrupt
  if ((action.def.interruptedBy & ccType) === 0) {
    return false;
  }

  action.interrupted = true;
  action.interruptType = ccType;
  return true;
}

/**
 * Check if entity can cast (not silenced/stunned based on action type).
 */
export function canCast(eid: number, def: ActionDef, currentCC: InterruptFlags): boolean {
  // Stun/suppress blocks everything
  if (currentCC & (INTERRUPT.STUN | INTERRUPT.SUPPRESS | INTERRUPT.KNOCKUP)) {
    return false;
  }

  // Silence blocks spells
  if (def.flags & ABILITY_FLAG.SPELL && currentCC & INTERRUPT.SILENCE) {
    return false;
  }

  // Disarm blocks attacks
  if (def.flags & ABILITY_FLAG.ATTACK && currentCC & INTERRUPT.DISARM) {
    return false;
  }

  // Ground blocks mobility
  if (def.flags & ABILITY_FLAG.MOBILITY && currentCC & INTERRUPT.GROUND) {
    return false;
  }

  return true;
}
