/**
 * Movement intent and displacement system.
 *
 * Handles:
 * - Normal lane movement
 * - Dashes and blinks
 * - Knockbacks and pulls
 * - Priority/conflict resolution
 * - Wall collision callbacks
 */

import type { GameWorld } from "../ecs/world";
import { Position } from "../ecs/components/Position";

// ── Movement Types ───────────────────────────────────────────────────

export const MOVE_TYPE = {
  NONE: "none",
  LANE: "lane",
  DASH: "dash",
  BLINK: "blink",
  KNOCKBACK: "knockback",
  PULL: "pull",
  CHARGE: "charge"
} as const;

export type MoveType = (typeof MOVE_TYPE)[keyof typeof MOVE_TYPE];

// Priority order: higher = takes precedence
export const MOVE_PRIORITY: Record<MoveType, number> = {
  [MOVE_TYPE.NONE]: 0,
  [MOVE_TYPE.LANE]: 1,
  [MOVE_TYPE.DASH]: 2,
  [MOVE_TYPE.CHARGE]: 3,
  [MOVE_TYPE.PULL]: 4,
  [MOVE_TYPE.KNOCKBACK]: 5,
  [MOVE_TYPE.BLINK]: 10 // instant, always works
};

// ── Movement Flags ───────────────────────────────────────────────────

export const MOVE_FLAG = {
  NONE: 0,
  IGNORE_SLOW: 1 << 0,
  IGNORE_ROOT: 1 << 1,
  IGNORE_GROUND: 1 << 2,
  UNSTOPPABLE: 1 << 3,
  COLLISION: 1 << 4, // stops on first enemy hit
  PASS_THROUGH: 1 << 5, // ignores unit collision
  TERRAIN_COLLISION: 1 << 6 // can hit walls
} as const;

export type MoveFlags = number;

// ── Terrain Tags ─────────────────────────────────────────────────────

export const TERRAIN_TAG = {
  NONE: 0,
  WALL: 1 << 0,
  SLOW_ZONE: 1 << 1,
  SPEED_ZONE: 1 << 2,
  CREATED_TERRAIN: 1 << 3,
  RIVER: 1 << 4,
  BRUSH: 1 << 5
} as const;

export type TerrainTags = number;

// ── Movement Intent ──────────────────────────────────────────────────

export interface MovementIntent {
  /** Unique ID for this intent. */
  id: number;
  /** Type of movement. */
  type: MoveType;
  /** Target X position. */
  targetX: number;
  /** Target Y position (optional for 1D). */
  targetY?: number;
  /** Speed in units/second. */
  speed: number;
  /** Duration limit (for knockbacks). */
  duration: number;
  /** Time elapsed. */
  elapsed: number;
  /** Source entity (for displacements). */
  sourceEid: number;
  /** Movement flags. */
  flags: MoveFlags;
  /** Priority override (-1 = use default). */
  priority: number;
  /** Callback on wall collision. */
  onWallHit?: (eid: number, wallX: number) => void;
  /** Callback on unit collision. */
  onUnitHit?: (eid: number, hitEid: number) => void;
  /** Callback on completion. */
  onComplete?: (eid: number) => void;
}

// ── Movement Store ───────────────────────────────────────────────────

let nextIntentId = 1;

class MovementStore {
  private intents = new Map<number, MovementIntent>();
  private entityBounds: { minX: number; maxX: number } = { minX: -Infinity, maxX: Infinity };

  getIntent(eid: number): MovementIntent | undefined {
    return this.intents.get(eid);
  }

  setIntent(eid: number, intent: Omit<MovementIntent, "id" | "elapsed">): MovementIntent {
    const fullIntent: MovementIntent = {
      ...intent,
      id: nextIntentId++,
      elapsed: 0,
      priority: intent.priority >= 0 ? intent.priority : MOVE_PRIORITY[intent.type]
    };

    // Check if new intent can override existing
    const existing = this.intents.get(eid);
    if (existing) {
      if (fullIntent.priority <= existing.priority && !(fullIntent.flags & MOVE_FLAG.UNSTOPPABLE)) {
        // Can't override
        return existing;
      }
    }

    this.intents.set(eid, fullIntent);
    return fullIntent;
  }

  clearIntent(eid: number): void {
    this.intents.delete(eid);
  }

  hasIntent(eid: number): boolean {
    return this.intents.has(eid);
  }

  getIntentType(eid: number): MoveType {
    return this.intents.get(eid)?.type ?? MOVE_TYPE.NONE;
  }

  setBounds(minX: number, maxX: number): void {
    this.entityBounds = { minX, maxX };
  }

  getBounds(): { minX: number; maxX: number } {
    return this.entityBounds;
  }

  clear(): void {
    this.intents.clear();
    nextIntentId = 1;
  }

  entities(): IterableIterator<number> {
    return this.intents.keys();
  }
}

export const movementStore = new MovementStore();

// ── Movement Operations ──────────────────────────────────────────────

export interface TickMovementResult {
  moved: boolean;
  completed: boolean;
  hitWall: boolean;
  hitUnit: boolean;
  distanceMoved: number;
}

/**
 * Tick movement for an entity.
 */
export function tickMovement(eid: number, delta: number): TickMovementResult {
  const intent = movementStore.getIntent(eid);
  if (!intent) {
    return { moved: false, completed: false, hitWall: false, hitUnit: false, distanceMoved: 0 };
  }

  const result: TickMovementResult = {
    moved: false,
    completed: false,
    hitWall: false,
    hitUnit: false,
    distanceMoved: 0
  };

  const startX = Position.x[eid];
  const targetX = intent.targetX;
  const direction = targetX > startX ? 1 : -1;
  const distance = Math.abs(targetX - startX);

  // Calculate movement for this tick
  let moveAmount = intent.speed * delta;

  // Blink is instant
  if (intent.type === MOVE_TYPE.BLINK) {
    Position.x[eid] = targetX;
    result.moved = true;
    result.completed = true;
    result.distanceMoved = distance;
    movementStore.clearIntent(eid);
    intent.onComplete?.(eid);
    return result;
  }

  // Duration-based movement (knockback, etc.)
  intent.elapsed += delta;
  if (intent.duration > 0 && intent.elapsed >= intent.duration) {
    moveAmount = intent.speed * (intent.duration - (intent.elapsed - delta));
    result.completed = true;
  }

  // Cap at remaining distance
  moveAmount = Math.min(moveAmount, distance);

  // Check bounds
  const bounds = movementStore.getBounds();
  let newX = startX + direction * moveAmount;

  if (newX < bounds.minX) {
    newX = bounds.minX;
    result.hitWall = true;
  } else if (newX > bounds.maxX) {
    newX = bounds.maxX;
    result.hitWall = true;
  }

  // Apply movement
  Position.x[eid] = newX;
  result.distanceMoved = Math.abs(newX - startX);
  result.moved = result.distanceMoved > 0;

  // Check if reached target
  if (Math.abs(newX - targetX) < 0.01) {
    result.completed = true;
  }

  // Handle wall hit
  if (result.hitWall && intent.onWallHit) {
    intent.onWallHit(eid, newX);
  }

  // Handle completion
  if (result.completed) {
    movementStore.clearIntent(eid);
    intent.onComplete?.(eid);
  }

  return result;
}

// ── Displacement Helpers ─────────────────────────────────────────────

/**
 * Apply a knockback from source position.
 */
export function applyKnockback(
  eid: number,
  sourceX: number,
  distance: number,
  duration: number,
  onWallHit?: (eid: number, wallX: number) => void
): MovementIntent {
  const targetX = Position.x[eid];
  const direction = targetX > sourceX ? 1 : -1;
  const finalX = targetX + direction * distance;
  const speed = distance / duration;

  return movementStore.setIntent(eid, {
    type: MOVE_TYPE.KNOCKBACK,
    targetX: finalX,
    speed,
    duration,
    sourceEid: 0,
    flags: MOVE_FLAG.NONE,
    priority: -1,
    onWallHit
  });
}

/**
 * Apply a pull toward source position.
 */
export function applyPull(eid: number, sourceEid: number, distance: number, duration: number): MovementIntent {
  const sourceX = Position.x[sourceEid];
  const currentX = Position.x[eid];
  const direction = sourceX > currentX ? 1 : -1;
  const pullDist = Math.min(distance, Math.abs(sourceX - currentX));
  const finalX = currentX + direction * pullDist;
  const speed = pullDist / duration;

  return movementStore.setIntent(eid, {
    type: MOVE_TYPE.PULL,
    targetX: finalX,
    speed,
    duration,
    sourceEid,
    flags: MOVE_FLAG.NONE,
    priority: -1
  });
}

/**
 * Start a dash to a target position.
 */
export function startDash(
  eid: number,
  targetX: number,
  speed: number,
  flags: MoveFlags = MOVE_FLAG.NONE,
  onComplete?: (eid: number) => void
): MovementIntent {
  const distance = Math.abs(targetX - Position.x[eid]);
  const duration = distance / speed;

  return movementStore.setIntent(eid, {
    type: MOVE_TYPE.DASH,
    targetX,
    speed,
    duration,
    sourceEid: eid,
    flags,
    priority: -1,
    onComplete
  });
}

/**
 * Instant blink to position.
 */
export function blink(eid: number, targetX: number): MovementIntent {
  return movementStore.setIntent(eid, {
    type: MOVE_TYPE.BLINK,
    targetX,
    speed: Infinity,
    duration: 0,
    sourceEid: eid,
    flags: MOVE_FLAG.UNSTOPPABLE,
    priority: -1
  });
}

/**
 * Set normal lane movement.
 */
export function setLaneMovement(eid: number, targetX: number, speed: number): MovementIntent {
  return movementStore.setIntent(eid, {
    type: MOVE_TYPE.LANE,
    targetX,
    speed,
    duration: -1, // no time limit
    sourceEid: eid,
    flags: MOVE_FLAG.NONE,
    priority: -1
  });
}

/**
 * Check if entity is being displaced.
 */
export function isDisplaced(eid: number): boolean {
  const type = movementStore.getIntentType(eid);
  return type === MOVE_TYPE.KNOCKBACK || type === MOVE_TYPE.PULL;
}

/**
 * Check if entity is dashing.
 */
export function isDashing(eid: number): boolean {
  const type = movementStore.getIntentType(eid);
  return type === MOVE_TYPE.DASH || type === MOVE_TYPE.CHARGE;
}
