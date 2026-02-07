/**
 * Centralized game configuration.
 * All balance values, tuning constants, and magic numbers live here.
 */

import type {
  SideConstants,
  CastleVariant,
  CastleMetrics,
  CastleConfig,
  TurretConfig,
  EconomyConfig,
  WaveConfig,
  ControlPointConfig,
  AIConfig,
  UnitSize,
  CombatConfig,
  LayoutProfile
} from "../types";

export const SIDE: SideConstants = {
  PLAYER: "player",
  AI: "ai"
};

export const CASTLE_VARIANTS: readonly CastleVariant[] = [
  {
    id: "v1",
    label: "Twin V1",
    baseKey: "castle_twin_base_v1",
    towerKey: "castle_twin_tower_v1"
  },
  {
    id: "v2",
    label: "Twin V2",
    baseKey: "castle_twin_base_v2",
    towerKey: "castle_twin_tower_v2"
  },
  {
    id: "v3",
    label: "Twin V3",
    baseKey: "castle_twin_base_v3",
    towerKey: "castle_twin_tower_v3"
  }
];

export const CASTLE_METRICS: CastleMetrics = {
  baseWidth: 132,
  baseHeight: 176,
  baseCenterYOffset: 28,
  baseFootInset: 10,
  towerWidth: 88,
  towerHeight: 60,
  towerOffsetY: -56,
  bannerOffsetX: 20,
  bannerOffsetY: -76,
  hpOffsetX: 0,
  hpOffsetY: -118,
  hpWidth: 220,
  hpHeight: 20
};

export const CASTLE_CONFIG: CastleConfig = {
  maxHp: 900,
  hitFlashDuration: 120,
  hitFlashColor: 0xffe0a3,
  shakeIntensity: 0.004,
  shakeDuration: 80,
  hitLogCooldown: 1600
};

export const TURRET_CONFIG: TurretConfig = {
  maxHp: 520,
  range: 190,
  damage: 22,
  attackRate: 0.72,
  earlyWaveShieldWaves: 2,
  earlyWaveDamageMult: 0.35,
  earlyWaveMinHpRatio: 0.35,
  arrowSize: { width: 12, height: 2 },
  arrowDuration: 260,
  flashDuration: 100
};

export const ECONOMY_CONFIG: EconomyConfig = {
  startingResources: 20,
  baseIncome: 1.1,
  zoneBonus: 1.2,
  pointBonus: 0.35,
  enemyPointBonus: 0.25,
  killBonus: 0.6,
  interestRate: 0.05,
  interestCap: 12,
  interestTick: 1
};

export const WAVE_CONFIG: WaveConfig = {
  lockSeconds: 5,
  supply: 12,
  slots: { front: 4, mid: 4, rear: 4 },
  stagger: 0.2,
  schedule: [
    { time: 0, interval: 45 },
    { time: 180, interval: 35 },
    { time: 420, interval: 25 }
  ],
  baseUnlockedColumns: 2,
  roleDiminishingThreshold: 3,
  roleDiminishingStep: 0.1,
  roleDiminishingFloor: 0.6
};

export const CONTROL_POINT_CONFIG: ControlPointConfig = {
  count: 5,
  progressRate: 0.12,
  ownershipThreshold: 0.4,
  contestDeadzone: 0.2,
  decayRate: 0.9,
  checkInterval: 0.3,
  zoneShakeIntensity: 0.002,
  zoneShakeDuration: 120
};

export const AI_CONFIG: AIConfig = {
  decisionInterval: 1400,
  defensiveHpThreshold: 0.85,
  rerollSafetyBuffer: 2
};

export const UNIT_SIZE: UnitSize = {
  frontline: 40,
  damage: 32,
  default: 34
};

export const COMBAT_CONFIG: CombatConfig = {
  castleAttackRange: 50,
  flashDuration: 100,
  spawnSpread: 10,
  spawnPulseRadius: 30,
  spawnPulseDuration: 450,
  calloutRiseDistance: 18,
  calloutDuration: 900
};

export const PHASE_LABELS: readonly string[] = ["Early", "Mid", "Late", "Final"];

export const LAYOUT_STORAGE_KEY = "layoutProfileV4";

export function createDefaultLayoutProfile(): LayoutProfile {
  return {
    mirrorMode: true,
    castle: {
      playerX: 66.11289364230541,
      aiX: 1213.8871063576946,
      anchorY: 291.6164943553179,
      baseWidth: CASTLE_METRICS.baseWidth,
      baseHeight: CASTLE_METRICS.baseHeight,
      baseCenterYOffset: CASTLE_METRICS.baseCenterYOffset,
      towerWidth: CASTLE_METRICS.towerWidth,
      towerHeight: CASTLE_METRICS.towerHeight,
      towerOffsetY: CASTLE_METRICS.towerOffsetY,
      bannerOffsetX: CASTLE_METRICS.bannerOffsetX,
      bannerOffsetY: CASTLE_METRICS.bannerOffsetY,
      hpOffsetX: CASTLE_METRICS.hpOffsetX,
      hpOffsetY: CASTLE_METRICS.hpOffsetY,
      hpWidth: CASTLE_METRICS.hpWidth,
      hpHeight: CASTLE_METRICS.hpHeight
    },
    decks: {
      foundation: {
        leftStart: -0.9007724301842046,
        leftEnd: 140.1152703505645,
        rightStart: 1139.8847296494355,
        rightEnd: 1280.9007724301841,
        topY: 397.3348544266191,
        height: 84
      },
      spawn: {
        leftStart: 69.13131313131312,
        leftEnd: 213.0469399881164,
        rightStart: 1066.9530600118835,
        rightEnd: 1210.8686868686868,
        topY: 418.60045157456915,
        height: 60
      }
    },
    bridge: {
      topY: 411.755531788473,
      plankOffsetY: 24,
      thickness: 14,
      showPillars: false,
      showRopes: false,
      showControlFx: false,
      ropeTopOffset: 0,
      ropeBottomOffset: 48,
      pillarOffsetY: 23,
      pillarHeight: 42,
      pillarStep: 90
    },
    turret: {
      sideInset: 26.366013071895452,
      yOffset: 9.61913250148541,
      showBase: false,
      baseWidth: 88.28363730688557,
      baseHeight: 68.21917428259343,
      headWidth: 56.180496468018134,
      headHeight: 56.180496468018134,
      hpOffsetX: 0,
      hpOffsetY: -36,
      hpWidth: 44,
      hpHeight: 5
    },
    units: {
      spawnInset: 80.30897207367796,
      laneY: 410.9949851455734,
      calloutOffsetY: -40
    },
    control: {
      y: 395.3895187165776,
      zoneWidth: 120,
      zoneHeight: 52
    }
  };
}
