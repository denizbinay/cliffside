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
  maxWaves: 12,
  supply: 12,
  slots: { front: 4, mid: 4, rear: 4 },
  stagger: 0.2,
  schedule: [
    { time: 0, interval: 35 },
    { time: 90, interval: 30 },
    { time: 210, interval: 25 }
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
      playerX: 33.40938799762329,
      aiX: 1246.5906120023767,
      anchorY: 240.6598692810458,
      baseWidth: 260,
      baseHeight: 320,
      baseCenterYOffset: 28,
      towerWidth: 180,
      towerHeight: 135.13202741322908,
      towerOffsetY: -56,
      bannerOffsetX: 20,
      bannerOffsetY: -76,
      hpOffsetX: 4.563279857397518,
      hpOffsetY: -64.00118835412954,
      hpWidth: 120,
      hpHeight: 10
    },
    decks: {
      foundation: {
        leftStart: -7.745692216280462,
        leftEnd: 235.18360071301254,
        rightStart: 1044.8163992869875,
        rightEnd: 1287.7456922162805,
        topY: 419.39070707070704,
        height: 160
      },
      spawn: {
        leftStart: 180.17112299465242,
        leftEnd: 359.2382650029708,
        rightStart: 920.7617349970292,
        rightEnd: 1099.8288770053475,
        topY: 436.85357100415905,
        height: 118
      }
    },
    bridge: {
      topY: 435.33247771836005,
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
      sideInset: 59.830065359477146,
      yOffset: 33.9566250742721,
      showBase: false,
      baseWidth: 108.66107764974379,
      baseHeight: 90.55089804145317,
      headWidth: 126.77125725803444,
      headHeight: 126.77125725803444,
      hpOffsetX: -1.521093285799111,
      hpOffsetY: -109.01247771836,
      hpWidth: 44,
      hpHeight: 5
    },
    units: {
      spawnInset: -78.64527629233508,
      laneY: 442.93794414735595,
      calloutOffsetY: -40
    },
    control: {
      y: 417.4453713606655,
      zoneWidth: 120,
      zoneHeight: 52
    }
  };
}
