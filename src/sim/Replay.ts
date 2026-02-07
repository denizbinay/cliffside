/**
 * Replay system for deterministic simulation playback.
 *
 * Records input commands and allows replay with same seed for
 * verification and desync detection.
 */

import type { GameWorld } from "../ecs/world";
import { Rng } from "./Rng";

// ── Command Types ────────────────────────────────────────────────────

export const COMMAND_TYPE = {
  // Unit commands
  SPAWN_UNIT: "spawnUnit",
  MOVE_UNIT: "moveUnit",
  STOP_UNIT: "stopUnit",

  // Ability commands
  CAST_ABILITY: "castAbility",
  CANCEL_CAST: "cancelCast",

  // Shop/economy
  PURCHASE: "purchase",
  SELL: "sell",
  REROLL: "reroll",

  // Wave management
  START_WAVE: "startWave",
  DRAFT_UNIT: "draftUnit",
  SET_STANCE: "setStance",

  // Game state
  PAUSE: "pause",
  UNPAUSE: "unpause"
} as const;

export type CommandType = (typeof COMMAND_TYPE)[keyof typeof COMMAND_TYPE];

// ── Command Definition ───────────────────────────────────────────────

export interface Command {
  /** Type of command. */
  type: CommandType;
  /** Tick when command should execute. */
  tick: number;
  /** Player/faction ID. */
  playerId: number;
  /** Command-specific payload. */
  payload: Record<string, unknown>;
}

// ── Command Queue ────────────────────────────────────────────────────

class CommandQueue {
  private commands: Command[] = [];
  private executed: Command[] = [];
  private nextIndex = 0;

  /**
   * Add a command to the queue.
   */
  push(command: Command): void {
    // Insert in tick order
    let i = this.commands.length - 1;
    while (i >= 0 && this.commands[i].tick > command.tick) {
      i--;
    }
    this.commands.splice(i + 1, 0, command);
  }

  /**
   * Get all commands for a specific tick.
   */
  getForTick(tick: number): Command[] {
    const result: Command[] = [];
    while (this.nextIndex < this.commands.length && this.commands[this.nextIndex].tick <= tick) {
      const cmd = this.commands[this.nextIndex];
      if (cmd.tick === tick) {
        result.push(cmd);
        this.executed.push(cmd);
      }
      this.nextIndex++;
    }
    return result;
  }

  /**
   * Get all recorded commands.
   */
  getAll(): Command[] {
    return [...this.commands];
  }

  /**
   * Get all executed commands.
   */
  getExecuted(): Command[] {
    return [...this.executed];
  }

  /**
   * Reset queue for replay.
   */
  reset(): void {
    this.nextIndex = 0;
    this.executed = [];
  }

  /**
   * Clear all commands.
   */
  clear(): void {
    this.commands = [];
    this.executed = [];
    this.nextIndex = 0;
  }

  /**
   * Load commands from array.
   */
  load(commands: Command[]): void {
    this.clear();
    for (const cmd of commands) {
      this.push(cmd);
    }
  }
}

export const commandQueue = new CommandQueue();

// ── State Snapshot ───────────────────────────────────────────────────

export interface StateSnapshot {
  tick: number;
  hash: number;
  rngState: number;
  entityCount: number;
  /** Optional detailed state for debugging. */
  details?: Record<string, unknown>;
}

// ── Simple Hash Function ─────────────────────────────────────────────

/**
 * FNV-1a hash for state checksums.
 */
function fnv1a(data: number[]): number {
  let hash = 2166136261;
  for (const byte of data) {
    hash ^= byte & 0xff;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/**
 * Hash a float32 array.
 */
function hashFloat32Array(arr: Float32Array): number {
  const bytes: number[] = [];
  const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  for (let i = 0; i < arr.length; i++) {
    const val = view.getFloat32(i * 4, true);
    // Convert to integer representation for hashing
    const intVal = Math.round(val * 1000); // 3 decimal precision
    bytes.push(intVal & 0xff, (intVal >> 8) & 0xff, (intVal >> 16) & 0xff, (intVal >> 24) & 0xff);
  }
  return fnv1a(bytes);
}

// ── Replay Harness ───────────────────────────────────────────────────

export interface ReplayConfig {
  seed: number;
  stepMs: number;
  commands: Command[];
}

export interface ReplayResult {
  success: boolean;
  finalTick: number;
  snapshots: StateSnapshot[];
  desyncTick?: number;
  expectedHash?: number;
  actualHash?: number;
}

/**
 * Create a snapshot of current game state.
 */
export function createSnapshot(world: GameWorld, componentArrays: Float32Array[]): StateSnapshot {
  const hashes: number[] = [];

  for (const arr of componentArrays) {
    hashes.push(hashFloat32Array(arr));
  }

  // Combine all component hashes
  const combinedHash = fnv1a(hashes);

  return {
    tick: world.sim.tick,
    hash: combinedHash,
    rngState: 0, // Would need to expose RNG state
    entityCount: componentArrays[0]?.length ?? 0
  };
}

/**
 * Compare two snapshots for desync.
 */
export function compareSnapshots(a: StateSnapshot, b: StateSnapshot): boolean {
  return a.tick === b.tick && a.hash === b.hash;
}

// ── Replay Session ───────────────────────────────────────────────────

export interface ReplaySession {
  config: ReplayConfig;
  snapshots: StateSnapshot[];
  currentTick: number;
  isComplete: boolean;
}

/**
 * Create a new replay session.
 */
export function createReplaySession(config: ReplayConfig): ReplaySession {
  commandQueue.load(config.commands);
  return {
    config,
    snapshots: [],
    currentTick: 0,
    isComplete: false
  };
}

/**
 * Record a snapshot during replay/recording.
 */
export function recordSnapshot(session: ReplaySession, snapshot: StateSnapshot): void {
  session.snapshots.push(snapshot);
  session.currentTick = snapshot.tick;
}

/**
 * Verify replay matches expected snapshots.
 */
export function verifyReplay(
  recorded: StateSnapshot[],
  replayed: StateSnapshot[]
): { valid: boolean; desyncTick?: number } {
  for (let i = 0; i < Math.min(recorded.length, replayed.length); i++) {
    if (!compareSnapshots(recorded[i], replayed[i])) {
      return { valid: false, desyncTick: recorded[i].tick };
    }
  }
  return { valid: true };
}

// ── Command Serialization ────────────────────────────────────────────

/**
 * Serialize commands to JSON.
 */
export function serializeCommands(commands: Command[]): string {
  return JSON.stringify(commands);
}

/**
 * Deserialize commands from JSON.
 */
export function deserializeCommands(json: string): Command[] {
  return JSON.parse(json) as Command[];
}

/**
 * Serialize a replay config.
 */
export function serializeReplay(config: ReplayConfig): string {
  return JSON.stringify(config);
}

/**
 * Deserialize a replay config.
 */
export function deserializeReplay(json: string): ReplayConfig {
  return JSON.parse(json) as ReplayConfig;
}
