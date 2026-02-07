/**
 * Test utilities for simulation systems.
 *
 * Provides:
 * - Golden test helpers for deterministic replays
 * - Property test utilities for effect ordering
 * - Contract tests for pipeline stages
 * - Matrix tests for CC/resource/mitigation interactions
 */

import type { GameWorld } from "../ecs/world";
import { createGameWorld } from "../ecs/world";
import { initializePipelineHooks } from "./PipelineHooks";
import { registerStandardEffectHandlers } from "./EffectHandlers";
import type { DamageContext, HealContext, DamagePipeline } from "./DamagePipeline";
import type { EffectContext } from "./EffectSystem";
import type { StateSnapshot, Command, ReplayConfig } from "./Replay";
import { createSnapshot, verifyReplay, commandQueue } from "./Replay";

// ── Test World Factory ───────────────────────────────────────────────

export interface TestWorldOptions {
  seed?: number;
  stepMs?: number;
}

/**
 * Create a test world with optional seed.
 */
export function createTestWorld(options: TestWorldOptions = {}): GameWorld {
  const world = createGameWorld({
    seed: options.seed ?? 12345,
    stepMs: options.stepMs ?? 50
  });
  initializePipelineHooks(world.sim.pipeline);
  registerStandardEffectHandlers();
  return world;
}

// ── Golden Test Helpers ──────────────────────────────────────────────

export interface GoldenTestConfig {
  name: string;
  seed: number;
  commands: Command[];
  expectedSnapshots: StateSnapshot[];
  snapshotInterval?: number; // ticks between snapshots
}

export interface GoldenTestResult {
  passed: boolean;
  name: string;
  desyncTick?: number;
  message?: string;
}

/**
 * Run a golden test and compare to expected snapshots.
 */
export function runGoldenTest(
  config: GoldenTestConfig,
  runSimulation: (world: GameWorld, ticks: number) => void,
  getComponentArrays: (world: GameWorld) => Float32Array[]
): GoldenTestResult {
  const world = createTestWorld({ seed: config.seed });
  commandQueue.load(config.commands);

  const interval = config.snapshotInterval ?? 10;
  const maxTicks =
    config.expectedSnapshots.length > 0 ? config.expectedSnapshots[config.expectedSnapshots.length - 1].tick : 100;

  const actualSnapshots: StateSnapshot[] = [];

  // Run simulation tick by tick
  for (let tick = 1; tick <= maxTicks; tick++) {
    runSimulation(world, 1);

    if (tick % interval === 0 || tick === maxTicks) {
      const snapshot = createSnapshot(world, getComponentArrays(world));
      actualSnapshots.push(snapshot);
    }
  }

  const verification = verifyReplay(config.expectedSnapshots, actualSnapshots);

  if (!verification.valid) {
    return {
      passed: false,
      name: config.name,
      desyncTick: verification.desyncTick,
      message: `Desync at tick ${verification.desyncTick}`
    };
  }

  return { passed: true, name: config.name };
}

// ── Property Test Utilities ──────────────────────────────────────────

/**
 * Generate random effect orderings to test commutativity.
 */
export function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Simple seedable random for property tests.
 */
export function createTestRng(seed: number): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    return state / 0x100000000;
  };
}

// ── Pipeline Contract Tests ──────────────────────────────────────────

export interface PipelineTestCase {
  name: string;
  setup: (world: GameWorld, pipeline: DamagePipeline) => void;
  input: {
    sourceEid: number;
    targetEid: number;
    amount: number;
  };
  expectedDamage?: number;
  expectedKill?: boolean;
  expectedShieldAbsorbed?: number;
}

/**
 * Run a pipeline contract test.
 */
export function runPipelineTest(
  testCase: PipelineTestCase,
  createEntities: (world: GameWorld) => { source: number; target: number }
): { passed: boolean; message?: string } {
  const world = createTestWorld();
  const { source, target } = createEntities(world);

  testCase.setup(world, world.sim.pipeline);

  const ctx = world.sim.pipeline.applyDamage(world, source, target, testCase.input.amount);

  if (testCase.expectedDamage !== undefined && ctx.amount !== testCase.expectedDamage) {
    return {
      passed: false,
      message: `Expected damage ${testCase.expectedDamage}, got ${ctx.amount}`
    };
  }

  if (testCase.expectedKill !== undefined && ctx.didKill !== testCase.expectedKill) {
    return {
      passed: false,
      message: `Expected kill=${testCase.expectedKill}, got ${ctx.didKill}`
    };
  }

  if (testCase.expectedShieldAbsorbed !== undefined && ctx.shieldAbsorbed !== testCase.expectedShieldAbsorbed) {
    return {
      passed: false,
      message: `Expected shield absorbed ${testCase.expectedShieldAbsorbed}, got ${ctx.shieldAbsorbed}`
    };
  }

  return { passed: true };
}

// ── Matrix Test Helpers ──────────────────────────────────────────────

export interface MatrixTestCase {
  cc: string[];
  resources: string[];
  mitigations: string[];
  expected: { canAct: boolean; damageMultiplier: number };
}

/**
 * Generate CC interaction matrix test cases.
 */
export function generateCCMatrix(ccTypes: string[]): MatrixTestCase[] {
  const cases: MatrixTestCase[] = [];

  // Single CC
  for (const cc of ccTypes) {
    cases.push({
      cc: [cc],
      resources: [],
      mitigations: [],
      expected: getCCExpectation([cc])
    });
  }

  // CC combinations
  for (let i = 0; i < ccTypes.length; i++) {
    for (let j = i + 1; j < ccTypes.length; j++) {
      cases.push({
        cc: [ccTypes[i], ccTypes[j]],
        resources: [],
        mitigations: [],
        expected: getCCExpectation([ccTypes[i], ccTypes[j]])
      });
    }
  }

  return cases;
}

function getCCExpectation(ccs: string[]): { canAct: boolean; damageMultiplier: number } {
  const hardCC = ["stun", "suppress", "knockup", "charm", "fear", "taunt"];
  const hasHardCC = ccs.some((cc) => hardCC.includes(cc));

  return {
    canAct: !hasHardCC,
    damageMultiplier: 1
  };
}

// ── Assertion Helpers ────────────────────────────────────────────────

/**
 * Assert that a value is approximately equal to expected.
 */
export function assertApprox(actual: number, expected: number, tolerance = 0.001): boolean {
  return Math.abs(actual - expected) < tolerance;
}

/**
 * Assert that damage was reduced by mitigation.
 */
export function assertDamageMitigated(ctx: DamageContext, baseDamage: number): boolean {
  return ctx.amount < baseDamage;
}

/**
 * Assert that effect was applied.
 */
export function assertEffectApplied(ctx: EffectContext): boolean {
  return !ctx.cancelled && ctx.result > 0;
}

// ── Test Suite Runner ────────────────────────────────────────────────

export interface TestSuite {
  name: string;
  tests: Array<{
    name: string;
    run: () => { passed: boolean; message?: string };
  }>;
}

export interface TestSuiteResult {
  name: string;
  passed: number;
  failed: number;
  results: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
}

/**
 * Run a test suite and collect results.
 */
export function runTestSuite(suite: TestSuite): TestSuiteResult {
  const results: TestSuiteResult["results"] = [];
  let passed = 0;
  let failed = 0;

  for (const test of suite.tests) {
    try {
      const result = test.run();
      results.push({ name: test.name, ...result });
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      results.push({
        name: test.name,
        passed: false,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`
      });
      failed++;
    }
  }

  return { name: suite.name, passed, failed, results };
}
