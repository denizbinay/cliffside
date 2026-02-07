import { createWorld, resetWorld } from "bitecs";
import type { IWorld } from "bitecs";
import { Rng } from "../sim/Rng";

const DEFAULT_SIM_STEP_MS = 50;
const DEFAULT_SIM_SEED = 1;

interface CreateWorldOptions {
  seed?: number;
  stepMs?: number;
}

export interface GameWorld extends IWorld {
  time: {
    delta: number;
    elapsed: number;
    now: number;
  };
  sim: {
    tick: number;
    stepMs: number;
    seed: number;
    rng: Rng;
  };
  scene: Phaser.Scene | null;
}

function normalizeSeed(seed: number | undefined): number {
  if (!Number.isFinite(seed)) return DEFAULT_SIM_SEED;
  return (seed as number) >>> 0;
}

function normalizeStepMs(stepMs: number | undefined): number {
  if (!Number.isFinite(stepMs) || (stepMs as number) <= 0) return DEFAULT_SIM_STEP_MS;
  return stepMs as number;
}

export function createGameWorld(options: CreateWorldOptions = {}): GameWorld {
  const seed = normalizeSeed(options.seed);
  const stepMs = normalizeStepMs(options.stepMs);
  const world = createWorld() as GameWorld;
  world.time = { delta: 0, elapsed: 0, now: 0 };
  world.sim = {
    tick: 0,
    stepMs,
    seed,
    rng: new Rng(seed)
  };
  world.scene = null;
  return world;
}

export function resetGameWorld(world: GameWorld): void {
  const seed = normalizeSeed(world.sim?.seed);
  const stepMs = normalizeStepMs(world.sim?.stepMs);
  resetWorld(world);
  world.time = { delta: 0, elapsed: 0, now: 0 };
  world.sim = {
    tick: 0,
    stepMs,
    seed,
    rng: new Rng(seed)
  };
  world.scene = null;
}

export function updateWorldTime(world: GameWorld, delta: number, now: number): void {
  world.time.delta = delta;
  world.time.elapsed += delta;
  world.time.now = now;
  world.sim.tick += 1;
}
