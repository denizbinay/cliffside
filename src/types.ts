/**
 * Shared type definitions for Cliffside Castle Conquest.
 */

// --- Side ---

export type Side = "player" | "ai";

export interface SideConstants {
  readonly PLAYER: "player";
  readonly AI: "ai";
}

// --- Units ---

export type UnitRole = "frontline" | "damage" | "support" | "disruptor";

export interface StatusOnHit {
  readonly type: "slow" | "pushback" | "stun";
  readonly duration?: number;
  readonly power?: number;
  readonly strength?: number;
}

export interface OnKillEffect {
  readonly type: "selfBuff";
  readonly duration: number;
  readonly power: number;
}

export interface UnitTypeConfig {
  readonly id: string;
  readonly name: string;
  readonly role: UnitRole;
  readonly summary: string;
  readonly special: string;
  readonly tier: number;
  readonly stageMin: number;
  readonly tags: readonly string[];
  readonly shopWeight: number;
  readonly hp: number;
  readonly dmg: number;
  readonly range: number;
  readonly speed: number;
  readonly attackRate: number;
  readonly cost: number;
  readonly presence: number;
  readonly color: number;
  readonly healAmount?: number;
  readonly critChance?: number;
  readonly critMultiplier?: number;
  readonly statusOnHit?: StatusOnHit;
  readonly onKill?: OnKillEffect;
}

export type UnitTypesMap = Record<string, UnitTypeConfig>;

// --- Castle Mode ---

export type CastleMode = "legacy" | "unified";

export interface CastleVariant {
  readonly id: string;
  readonly label: string;
  readonly baseKey: string;
}

// --- Config Blocks ---

export interface CastleMetrics {
  readonly baseWidth: number;
  readonly baseHeight: number;
  readonly baseCenterYOffset: number;
  readonly baseFootInset: number;
  readonly towerWidth: number;
  readonly towerHeight: number;
  readonly towerOffsetY: number;
  readonly bannerOffsetX: number;
  readonly bannerOffsetY: number;
  readonly hpOffsetX: number;
  readonly hpOffsetY: number;
  readonly hpWidth: number;
  readonly hpHeight: number;
}

export interface CastleConfig {
  readonly maxHp: number;
  readonly hitFlashDuration: number;
  readonly hitFlashColor: number;
  readonly shakeIntensity: number;
  readonly shakeDuration: number;
  readonly hitLogCooldown: number;
}

export interface TurretConfig {
  readonly maxHp: number;
  readonly range: number;
  readonly damage: number;
  readonly attackRate: number;
  readonly earlyWaveShieldWaves: number;
  readonly earlyWaveDamageMult: number;
  readonly earlyWaveMinHpRatio: number;
  readonly arrowSize: { readonly width: number; readonly height: number };
  readonly arrowDuration: number;
  readonly flashDuration: number;
}

export interface EconomyConfig {
  readonly startingResources: number;
  readonly baseIncome: number;
  readonly zoneBonus: number;
  readonly pointBonus: number;
  readonly enemyPointBonus: number;
  readonly killBonus: number;
  readonly interestRate: number;
  readonly interestCap: number;
  readonly interestTick: number;
}

export interface WaveSlots {
  readonly front: number;
  readonly mid: number;
  readonly rear: number;
}

export interface WaveScheduleEntry {
  readonly time: number;
  readonly interval: number;
}

export interface WaveConfig {
  readonly maxWaves: number;
  readonly supply: number;
  readonly slots: WaveSlots;
  readonly stagger: number;
  readonly schedule: readonly WaveScheduleEntry[];
  readonly baseUnlockedColumns: number;
  readonly roleDiminishingThreshold: number;
  readonly roleDiminishingStep: number;
  readonly roleDiminishingFloor: number;
}

export interface ControlPointConfig {
  readonly count: number;
  readonly progressRate: number;
  readonly ownershipThreshold: number;
  readonly contestDeadzone: number;
  readonly decayRate: number;
  readonly checkInterval: number;
  readonly zoneShakeIntensity: number;
  readonly zoneShakeDuration: number;
}

export interface AIConfig {
  readonly decisionInterval: number;
  readonly defensiveHpThreshold: number;
  readonly rerollSafetyBuffer: number;
}

export interface UnitSize {
  readonly frontline: number;
  readonly damage: number;
  readonly default: number;
  readonly [key: string]: number;
}

export interface CombatConfig {
  readonly castleAttackRange: number;
  readonly flashDuration: number;
  readonly spawnSpread: number;
  readonly spawnPulseRadius: number;
  readonly spawnPulseDuration: number;
  readonly calloutRiseDistance: number;
  readonly calloutDuration: number;
}

// --- Layout Profile ---

export interface LayoutCastleProfile {
  playerX: number;
  aiX: number;
  anchorY: number;
  baseWidth: number;
  baseHeight: number;
  baseCenterYOffset: number;
  towerWidth: number;
  towerHeight: number;
  towerOffsetY: number;
  bannerOffsetX: number;
  bannerOffsetY: number;
  hpOffsetX: number;
  hpOffsetY: number;
  hpWidth: number;
  hpHeight: number;
}

export interface LayoutDeckSegment {
  leftStart: number;
  leftEnd: number;
  rightStart: number;
  rightEnd: number;
  topY: number;
  height: number;
}

export interface LayoutBridgeSpriteProfile {
  x: number;
  y: number;
  scale: number;
}

export interface LayoutTurretProfile {
  x: number;
  y: number;
  showBase: boolean;
  baseWidth: number;
  baseHeight: number;
  headWidth: number;
  headHeight: number;
  hpOffsetX: number;
  hpOffsetY: number;
  hpWidth: number;
  hpHeight: number;
}

export interface LayoutLaneProfile {
  startX: number;
  endX: number;
  y: number;
  calloutOffsetY: number;
}

export interface LayoutControlProfile {
  startX: number;
  endX: number;
  y: number;
  zoneWidth: number;
  zoneHeight: number;
}

export interface LayoutSpawnProfile {
  playerX: number;
  aiX: number;
}

export interface LayoutProfile {
  mirrorMode: boolean;
  castle: LayoutCastleProfile;
  decks: {
    foundation: LayoutDeckSegment;
    spawn: LayoutDeckSegment;
  };
  bridgeSprite1: LayoutBridgeSpriteProfile;
  bridgeSprite2: LayoutBridgeSpriteProfile;
  turret: LayoutTurretProfile;
  spawn: LayoutSpawnProfile;
  lane: LayoutLaneProfile;
  control: LayoutControlProfile;
}

// --- Abilities ---

export interface HealWaveAbility {
  readonly id: "healWave";
  readonly name: string;
  readonly cost: number;
  readonly cooldown: number;
  readonly radius: number;
  readonly amount: number;
}

export interface PulseAbility {
  readonly id: "pulse";
  readonly name: string;
  readonly cost: number;
  readonly cooldown: number;
  readonly radius: number;
  readonly pushStrength: number;
  readonly stunDuration: number;
}

export type Ability = HealWaveAbility | PulseAbility;

export type AbilityId = "healWave" | "pulse";

export type AbilitiesMap = Record<AbilityId, Ability>;

// --- Stances ---

export interface StanceModifiers {
  readonly hpMult: number;
  readonly dmgMult: number;
  readonly rangeMult: number;
  readonly speedMult: number;
  readonly attackRateMult: number;
  readonly healMult: number;
  readonly presenceMult: number;
}

export type StanceId = "normal" | "defensive" | "aggressive";

export interface Stance {
  readonly id: StanceId;
  readonly name: string;
  readonly summary: string;
  readonly modifiers: StanceModifiers;
}

export type StancesMap = Record<StanceId, Stance>;

// --- Shop ---

export interface ShopConfig {
  readonly offersPerWave: number;
  readonly baseRerollCost: number;
  readonly rerollCostGrowth: number;
  readonly stageTierCaps: readonly number[];
  readonly earlyRoleGuarantees: readonly string[];
}

// --- Unit Animation ---

export interface KeyedStripSheetDef {
  readonly sourceKey: string;
  readonly sourceFile: string;
  readonly outputKey: string;
  readonly fps: number;
  readonly repeat: number;
  readonly boxesKey?: string;
  readonly boxesFile?: string;
  readonly frameSequence?: readonly number[];
}

export interface AtlasSheetDef {
  readonly atlasKey: string;
  readonly atlasTextureFile: string;
  readonly atlasDataFile: string;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly framePrefix?: string;
  readonly frameSuffix?: string;
  readonly fps: number;
  readonly repeat: number;
  readonly yoyo?: boolean;
}

export interface SpritesheetDef {
  readonly sheetKey: string;
  readonly sheetFile: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly frameSequence?: readonly number[];
  readonly fps: number;
  readonly repeat: number;
  readonly yoyo?: boolean;
}

export type AnimationSheetDef = KeyedStripSheetDef | AtlasSheetDef | SpritesheetDef;

export interface UnitAnimationAsset {
  readonly preprocess?: "keyed-strip" | "bbox-aligned-rgba" | "atlas";
  readonly sheets: Record<string, AnimationSheetDef>;
}

export interface AnimationAction {
  readonly key: string;
  readonly lock?: boolean;
}

export interface UnitAnimationProfile {
  readonly textureKey: string;
  readonly sizeScale: number;
  readonly widthScale?: number;
  readonly heightScale?: number;
  readonly healthBarOffsetY?: number;
  readonly originX: number;
  readonly originY: number;
  readonly actions: Record<string, AnimationAction>;
  readonly fallback: Record<string, readonly string[]>;
}

// --- Draft ---

export type DraftRow = "front" | "mid" | "rear";

export interface WaveDraft {
  front: (string | null)[];
  mid: (string | null)[];
  rear: (string | null)[];
}

// --- Control Point ---

export interface ControlPoint {
  index: number;
  x: number;
  y: number;
  owner: Side | "neutral";
  progress: number;
  glow: Phaser.GameObjects.Image | null;
  rune: Phaser.GameObjects.Image | null;
  marker: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  zone: Phaser.Geom.Rectangle;
}

// --- UI State ---

export interface UiState {
  playerResources: number;
  playerIncome: number;
  aiResources: number;
  aiIncome: number;
  playerCastle: { hp: number; maxHp: number };
  aiCastle: { hp: number; maxHp: number };
  controlPoints: (Side | "neutral")[];
  wave: {
    countdown: number;
    interval: number;
    number: number;
    phaseLabel: string;
    stageIndex: number;
    unlockedColumns: number;
  };
  shop: {
    offers: (string | null)[];
    rerollCost: number;
    canReroll: boolean;
  };
  waveDraft: WaveDraft;
  waveSupply: number;
  waveSlots: WaveSlots;
  waveStance: StanceId;
  abilityCooldowns: Record<AbilityId, number>;
  playerAliveUnits?: number;
  aiAliveUnits?: number;
  playerPresence?: number;
  aiPresence?: number;
  isGameOver: boolean;
}

// --- Income Details ---

export interface IncomeDetails {
  base: number;
  pointBonus: number;
  enemyBonus: number;
  interest: number;
  total: number;
}
