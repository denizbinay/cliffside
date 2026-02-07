/**
 * Simulation event bus for decoupled game events.
 *
 * This is the authoritative source for gameplay events that the UI/audio
 * systems subscribe to. Keeps presentation separate from simulation.
 */

import type { GameWorld } from "../ecs/world";
import type { DamageType } from "./DamageTypes";

// ── Event Types ──────────────────────────────────────────────────────

export const SIM_EVENT = {
  // Combat events
  ATTACK_START: "attackStart",
  ATTACK_HIT: "attackHit",
  DAMAGE_DEALT: "damageDealt",
  CRIT: "crit",
  KILL: "kill",
  TAKEDOWN: "takedown",

  // Ability events
  CAST_START: "castStart",
  CAST_RELEASE: "castRelease",
  CAST_CANCEL: "castCancel",
  CHANNEL_START: "channelStart",
  CHANNEL_END: "channelEnd",

  // Status events
  STATUS_APPLY: "statusApply",
  STATUS_EXPIRE: "statusExpire",
  STATUS_REFRESH: "statusRefresh",
  SHIELD_APPLY: "shieldApply",
  SHIELD_BREAK: "shieldBreak",

  // Movement events
  DASH_START: "dashStart",
  DASH_END: "dashEnd",
  BLINK: "blink",
  KNOCKBACK: "knockback",
  PULL: "pull",

  // Heal events
  HEAL: "heal",

  // Resource events
  RESOURCE_SPEND: "resourceSpend",
  RESOURCE_GAIN: "resourceGain",

  // Unit lifecycle
  SPAWN: "spawn",
  DEATH: "death",
  LEVEL_UP: "levelUp",

  // Effect events
  EFFECT_APPLY: "effectApply",
  EFFECT_EXPIRE: "effectExpire",
  EFFECT_TRIGGER: "effectTrigger",

  // Game state
  WAVE_START: "waveStart",
  WAVE_END: "waveEnd",
  OBJECTIVE_CAPTURE: "objectiveCapture",
  GAME_END: "gameEnd"
} as const;

export type SimEventType = (typeof SIM_EVENT)[keyof typeof SIM_EVENT];

// ── Event Payloads ───────────────────────────────────────────────────

export interface BaseSimEvent {
  type: SimEventType;
  tick: number;
  timestamp: number;
}

export interface CombatEvent extends BaseSimEvent {
  type: "attackStart" | "attackHit" | "damageDealt" | "crit" | "kill" | "takedown";
  sourceEid: number;
  targetEid: number;
  damage?: number;
  damageType?: DamageType;
  isCrit?: boolean;
}

export interface CastEvent extends BaseSimEvent {
  type: "castStart" | "castRelease" | "castCancel" | "channelStart" | "channelEnd";
  sourceEid: number;
  targetEid?: number;
  abilityId: string;
  targetX?: number;
  targetY?: number;
}

export interface StatusEvent extends BaseSimEvent {
  type: "statusApply" | "statusExpire" | "statusRefresh" | "shieldApply" | "shieldBreak";
  sourceEid: number;
  targetEid: number;
  statusId: string;
  duration?: number;
  stacks?: number;
  amount?: number;
}

export interface MovementEvent extends BaseSimEvent {
  type: "dashStart" | "dashEnd" | "blink" | "knockback" | "pull";
  sourceEid: number;
  targetEid: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface HealEvent extends BaseSimEvent {
  type: "heal";
  sourceEid: number;
  targetEid: number;
  amount: number;
  overheal: number;
}

export interface ResourceEvent extends BaseSimEvent {
  type: "resourceSpend" | "resourceGain";
  entityEid: number;
  resourceType: string;
  amount: number;
}

export interface LifecycleEvent extends BaseSimEvent {
  type: "spawn" | "death" | "levelUp";
  entityEid: number;
  killerEid?: number;
  unitType?: string;
  level?: number;
}

export interface EffectEvent extends BaseSimEvent {
  type: "effectApply" | "effectExpire" | "effectTrigger";
  sourceEid: number;
  targetEid: number;
  effectId: string;
  effectKind: string;
}

export interface GameStateEvent extends BaseSimEvent {
  type: "waveStart" | "waveEnd" | "objectiveCapture" | "gameEnd";
  data?: Record<string, unknown>;
}

export type SimEvent =
  | CombatEvent
  | CastEvent
  | StatusEvent
  | MovementEvent
  | HealEvent
  | ResourceEvent
  | LifecycleEvent
  | EffectEvent
  | GameStateEvent;

// ── Event Handler Types ──────────────────────────────────────────────

export type SimEventHandler<T extends SimEvent = SimEvent> = (event: T) => void;

// ── Event Bus ────────────────────────────────────────────────────────

type HandlerMap = Map<SimEventType, SimEventHandler[]>;

class SimEventBus {
  private handlers: HandlerMap = new Map();
  private queue: SimEvent[] = [];
  private recording = false;
  private recordedEvents: SimEvent[] = [];

  /**
   * Subscribe to an event type.
   */
  on<T extends SimEventType>(type: T, handler: SimEventHandler): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Emit an event immediately.
   */
  emit(event: SimEvent): void {
    if (this.recording) {
      this.recordedEvents.push(event);
    }

    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  }

  /**
   * Queue an event for deferred processing.
   */
  enqueue(event: SimEvent): void {
    this.queue.push(event);
  }

  /**
   * Process all queued events.
   */
  flush(): void {
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      this.emit(event);
    }
  }

  /**
   * Clear all queued events.
   */
  clearQueue(): void {
    this.queue.length = 0;
  }

  /**
   * Remove all handlers.
   */
  clear(): void {
    this.handlers.clear();
    this.queue.length = 0;
  }

  /**
   * Start recording events (for replay).
   */
  startRecording(): void {
    this.recording = true;
    this.recordedEvents = [];
  }

  /**
   * Stop recording and return events.
   */
  stopRecording(): SimEvent[] {
    this.recording = false;
    const events = this.recordedEvents;
    this.recordedEvents = [];
    return events;
  }
}

// Global event bus instance
export const simEventBus = new SimEventBus();

// ── Helper Functions ─────────────────────────────────────────────────

/**
 * Create and emit a combat event.
 */
export function emitCombat(
  world: GameWorld,
  type: CombatEvent["type"],
  sourceEid: number,
  targetEid: number,
  damage?: number,
  damageType?: DamageType,
  isCrit?: boolean
): void {
  simEventBus.emit({
    type,
    tick: world.sim.tick,
    timestamp: world.time.elapsed,
    sourceEid,
    targetEid,
    damage,
    damageType,
    isCrit
  });
}

/**
 * Create and emit a cast event.
 */
export function emitCast(
  world: GameWorld,
  type: CastEvent["type"],
  sourceEid: number,
  abilityId: string,
  targetEid?: number,
  targetX?: number,
  targetY?: number
): void {
  simEventBus.emit({
    type,
    tick: world.sim.tick,
    timestamp: world.time.elapsed,
    sourceEid,
    targetEid,
    abilityId,
    targetX,
    targetY
  });
}

/**
 * Create and emit a status event.
 */
export function emitStatus(
  world: GameWorld,
  type: StatusEvent["type"],
  sourceEid: number,
  targetEid: number,
  statusId: string,
  duration?: number,
  stacks?: number,
  amount?: number
): void {
  simEventBus.emit({
    type,
    tick: world.sim.tick,
    timestamp: world.time.elapsed,
    sourceEid,
    targetEid,
    statusId,
    duration,
    stacks,
    amount
  });
}

/**
 * Create and emit a heal event.
 */
export function emitHeal(
  world: GameWorld,
  sourceEid: number,
  targetEid: number,
  amount: number,
  overheal: number = 0
): void {
  simEventBus.emit({
    type: SIM_EVENT.HEAL,
    tick: world.sim.tick,
    timestamp: world.time.elapsed,
    sourceEid,
    targetEid,
    amount,
    overheal
  });
}

/**
 * Create and emit a death event.
 */
export function emitDeath(world: GameWorld, entityEid: number, killerEid?: number): void {
  simEventBus.emit({
    type: SIM_EVENT.DEATH,
    tick: world.sim.tick,
    timestamp: world.time.elapsed,
    entityEid,
    killerEid
  });
}

/**
 * Create and emit a spawn event.
 */
export function emitSpawn(world: GameWorld, entityEid: number, unitType?: string): void {
  simEventBus.emit({
    type: SIM_EVENT.SPAWN,
    tick: world.sim.tick,
    timestamp: world.time.elapsed,
    entityEid,
    unitType
  });
}
