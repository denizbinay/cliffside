/**
 * Simulation module exports.
 *
 * Central export point for all simulation systems.
 */

// Core
export { SimClock } from "./SimClock";
export { Rng } from "./Rng";

// Combat
export { DamagePipeline, DAMAGE_FLAGS } from "./DamagePipeline";
export type { DamageContext, HealContext, DamageHook, HealHook, DamageStage, HealStage } from "./DamagePipeline";
export { DAMAGE_TYPE, DAMAGE_TYPE_LABELS } from "./DamageTypes";
export type { DamageType } from "./DamageTypes";

// Effects
export {
  EFFECT_KIND,
  EFFECT_STAGE,
  registerEffectHandler,
  clearEffectHandlers,
  applyEffect,
  applyEffects,
  createActiveEffect,
  tickActiveEffect,
  addEffectStacks,
  consumeEffectStacks,
  refreshEffectDuration
} from "./EffectSystem";
export type { EffectKind, EffectDef, EffectContext, EffectHandler, EffectStage, ActiveEffect } from "./EffectSystem";

// Conditions
export { CONDITION_TYPE, evaluateCondition, evaluateAllConditions, evaluateAnyCondition } from "./EffectConditions";
export type { ConditionType, EffectCondition, ConditionContext } from "./EffectConditions";

// Stats
export {
  STAT,
  MODIFIER_TYPE,
  statModifierStore,
  calculateStat,
  getStat,
  calculateArmorReduction,
  applyArmorToDamage,
  calculateEffectiveArmor
} from "./Stats";
export type { StatKey, ModifierType, StatModifier, StatCalcResult } from "./Stats";

// Resources
export {
  RESOURCE_TYPE,
  resourceStore,
  spendResource,
  restoreResource,
  addStacks,
  addFury,
  canAfford,
  tickResource
} from "./Resources";
export type { ResourceType, ResourceDef, ResourceState, SpendResult } from "./Resources";

// Shields
export { SHIELD_ABSORB, shieldStore, absorbDamage, createShield } from "./Shields";
export type { ShieldAbsorbType, Shield, AbsorbResult } from "./Shields";

// Actions
export {
  ACTION_STATE,
  INTERRUPT_TYPE,
  INTERRUPT,
  ABILITY_FLAG,
  actionStore,
  startAction,
  tickAction,
  interruptAction,
  canCast
} from "./ActionSystem";
export type {
  ActionState,
  InterruptFlags,
  AbilityFlags,
  ActionDef,
  ActionInstance,
  StartActionResult,
  TickActionResult
} from "./ActionSystem";

// Targeting
export {
  TARGET_FLAG,
  TARGET_STATE,
  targetingStore,
  checkEligibility,
  isTargetableEnemy,
  isAliveInRange
} from "./Targeting";
export type { TargetFlags, RevealSource, EligibilityContext, EligibilityResult } from "./Targeting";

// Movement
export {
  MOVE_TYPE,
  MOVE_PRIORITY,
  MOVE_FLAG,
  TERRAIN_TAG,
  movementStore,
  tickMovement,
  applyKnockback,
  applyPull,
  startDash,
  blink,
  setLaneMovement,
  isDisplaced,
  isDashing
} from "./Movement";
export type { MoveType, MoveFlags, TerrainTags, MovementIntent, TickMovementResult } from "./Movement";

// Events
export {
  SIM_EVENT,
  simEventBus,
  emitCombat,
  emitCast,
  emitStatus,
  emitHeal,
  emitDeath,
  emitSpawn
} from "./SimEventBus";
export type {
  SimEventType,
  SimEvent,
  BaseSimEvent,
  CombatEvent,
  CastEvent,
  StatusEvent,
  MovementEvent,
  HealEvent,
  ResourceEvent,
  LifecycleEvent,
  EffectEvent,
  GameStateEvent,
  SimEventHandler
} from "./SimEventBus";

// Replay
export {
  COMMAND_TYPE,
  commandQueue,
  createSnapshot,
  compareSnapshots,
  createReplaySession,
  recordSnapshot,
  verifyReplay,
  serializeCommands,
  deserializeCommands,
  serializeReplay,
  deserializeReplay
} from "./Replay";
export type { CommandType, Command, StateSnapshot, ReplayConfig, ReplayResult, ReplaySession } from "./Replay";

// Test Utils
export {
  createTestWorld,
  runGoldenTest,
  shuffleArray,
  createTestRng,
  runPipelineTest,
  generateCCMatrix,
  assertApprox,
  assertDamageMitigated,
  assertEffectApplied,
  runTestSuite
} from "./TestUtils";
export type {
  TestWorldOptions,
  GoldenTestConfig,
  GoldenTestResult,
  PipelineTestCase,
  MatrixTestCase,
  TestSuite,
  TestSuiteResult
} from "./TestUtils";
