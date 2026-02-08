/**
 * Centralized game configuration.
 * All balance values, tuning constants, and magic numbers live here.
 */

import type {
  SideConstants,
  CastleMode,
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

/**
 * Castle display mode:
 * - "unified": Single castle asset (castle.png) used for both sides, flipped for AI
 * - "legacy": Separate assets per side with variant support
 */
export const DEPTH = {
  SKYBOX: -100,
  BACKGROUND: -50,
  CASTLE: -10,
  CASTLE_HP: -5,
  BRIDGE_SPRITE: -2,
  PLATFORMS: 0,
  BRIDGE_PLANKS: 6,
  CONTROL_POINT: 10,
  TURRETS: 20,
  TURRET_HP: 21,
  UNITS: 30,
  UNIT_HP: 31,
  UI: 100
};

export const CASTLE_MODE: CastleMode = "unified";

export const CASTLE_VARIANTS: readonly CastleVariant[] = [
  {
    id: "v1",
    label: "Twin V1",
    baseKey: "castle_twin_base_v1"
  },
  {
    id: "v2",
    label: "Twin V2",
    baseKey: "castle_twin_base_v2"
  },
  {
    id: "v3",
    label: "Twin V3",
    baseKey: "castle_twin_base_v3"
  }
];

export const CASTLE_METRICS: CastleMetrics = {
  baseWidth: 132,
  baseHeight: 88,
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

export const LAYOUT_STORAGE_KEY = "layoutProfileV10";

export function createDefaultLayoutProfile(): LayoutProfile {
  return {
    mirrorMode: true,
    castle: {
      playerX: 115.54842543077845,
      aiX: 1164.4515745692215,
      anchorY: 306.82742721330965,
      baseWidth: 772.4799544945374,
      baseHeight: 579.3599658709031,
      baseCenterYOffset: 28,
      towerWidth: 386.2399772472687,
      towerHeight: 289.67998293545156,
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
    bridgeSprite1: {
      x: 375.92279855247284,
      y: 492.5693606755127,
      scale: 0.49960008
    },
    bridgeSprite2: {
      x: 906.3932448733414,
      y: 494.88540410132686,
      scale: 0.51
    },
    turret: {
      x: 269.1194209891436,
      y: 476.17611580217124,
      showBase: false,
      baseWidth: 66.5777025179655,
      baseHeight: 55.48141876497127,
      headWidth: 77.67398627095976,
      headHeight: 77.67398627095976,
      hpOffsetX: 6.199051466914966,
      hpOffsetY: -68.86772500424661,
      hpWidth: 44,
      hpHeight: 5
    },
    spawn: {
      playerX: 164.48733413751512,
      aiX: 1115.512665862485
    },
    lane: {
      startX: 40.26537997587455,
      endX: 1239.7346200241254,
      y: 466.16043425814223,
      calloutOffsetY: -40
    },
    control: {
      startX: 407.09288299155605,
      endX: 872.907117008444,
      y: 435.52834740651394,
      zoneWidth: 120,
      zoneHeight: 250
    }
  };
}
