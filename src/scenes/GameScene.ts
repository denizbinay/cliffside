import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units";
import { ABILITIES } from "../data/abilities";
import {
  SIDE,
  CASTLE_MODE,
  CASTLE_VARIANTS,
  CASTLE_METRICS,
  CASTLE_CONFIG,
  CONTROL_POINT_CONFIG,
  COMBAT_CONFIG,
  WAVE_CONFIG,
  DEPTH,
  LAYOUT_STORAGE_KEY,
  createDefaultLayoutProfile
} from "../config/GameConfig";

import EconomySystem from "../systems/EconomySystem";
import ShopManager from "../systems/ShopManager";
import WaveManager from "../systems/WaveManager";
import AIController from "../systems/AIController";
import LayoutDevTool from "../devtools/LayoutDevTool";
import UnitDevTool from "../devtools/UnitDevTool";
import { GameSceneBridge } from "../ecs/bridges/GameSceneBridge";
import { SimClock } from "../sim/SimClock";
import {
  createCastle,
  createCastleVisuals,
  createControlPoint,
  createTurret,
  createTurretVisuals,
  createUnit,
  createUnitVisuals
} from "../ecs/factories";
import { EntityType, Faction, Health, Position, Render, StatusEffects, FACTION } from "../ecs/components";
import { ENTITY_TYPE } from "../ecs/constants";
import { defineQuery, removeEntity } from "bitecs";
import { buildGhostShapes } from "../utils/ghostShapes";

import type {
  Side,
  LayoutProfile,
  ControlPoint,
  WaveDraft,
  WaveSlots,
  AbilityId,
  CastleVariant,
  IncomeDetails,
  UiState
} from "../types";

const unitEntitiesQuery = defineQuery([Position, Health, EntityType, Render, Faction]);

interface GhostGhost {
  container: Phaser.GameObjects.Container;
  currentType: string | null;
}

interface GhostRow {
  front: GhostGhost[];
  mid: GhostGhost[];
  rear: GhostGhost[];
  [key: string]: GhostGhost[];
}

interface LayoutBoard {
  leftFoundationStart: number;
  leftFoundationEnd: number;
  rightFoundationStart: number;
  rightFoundationEnd: number;
  leftSpawnStart: number;
  leftSpawnEnd: number;
  rightSpawnStart: number;
  rightSpawnEnd: number;
  bridgeLeft: number;
  bridgeRight: number;
}

export default class GameScene extends Phaser.Scene {
  castleVariants!: readonly CastleVariant[];
  castleVariantIndex!: number;
  width!: number;
  height!: number;
  uiLeft!: number;
  uiTop!: number;
  uiBottom!: number;
  playArea!: { x: number; y: number; width: number; height: number };

  layoutProfile!: LayoutProfile;
  bridgeVisuals!: (
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Rectangle
    | Phaser.GameObjects.TileSprite
    | Phaser.GameObjects.Graphics
    | Phaser.GameObjects.Arc
  )[];

  playerCastleEid!: number;
  aiCastleEid!: number;
  playerTurretEid!: number | null;
  aiTurretEid!: number | null;
  controlPointEids!: number[];

  economy!: EconomySystem;
  shopManager!: ShopManager;
  waveManager!: WaveManager;
  aiController!: AIController;
  ecsBridge!: GameSceneBridge;

  layoutDevTool!: LayoutDevTool;
  unitDevTool!: UnitDevTool;

  isGameOver!: boolean;
  lastCastleHitLog!: { player: number; ai: number };
  lastCastleHp!: { player: number; ai: number };
  matchTime!: number;
  zoneOwner!: Side | "neutral";
  abilityCooldowns!: Record<AbilityId, number>;
  ghostAlpha!: number;
  ghostFormation!: { rows: GhostRow };
  simClock!: SimClock;
  timeScaleKey!: Phaser.Input.Keyboard.Key;

  _controlPoints!: ControlPoint[];

  // Layout computed properties
  castleXLeft!: number;
  castleXRight!: number;
  castleAnchorY!: number;
  castleBaseWidth!: number;
  castleBaseHeight!: number;
  castleBaseCenterYOffset!: number;
  castleFootY!: number;
  foundationDeckY!: number;
  foundationDeckHeight!: number;
  spawnDeckY!: number;
  spawnDeckHeight!: number;
  bridgeSpriteImage1!: Phaser.GameObjects.Image | null;
  bridgeSpriteImage2!: Phaser.GameObjects.Image | null;
  turretX!: number;
  turretY!: number;
  spawnXPlayer!: number;
  spawnXAI!: number;
  laneStartX!: number;
  laneEndX!: number;
  laneY!: number;
  laneCalloutOffsetY!: number;
  controlStartX!: number;
  controlEndX!: number;
  controlY!: number;
  controlZoneWidth!: number;
  controlZoneHeight!: number;
  boardLayout!: LayoutBoard;

  platformLeftStart!: number;
  platformLeftEnd!: number;
  platformRightStart!: number;
  platformRightEnd!: number;
  bridgeLeft!: number;
  bridgeRight!: number;

  constructor() {
    super("Game");
  }

  create(): void {
    this.castleVariants = CASTLE_VARIANTS;
    this.castleVariantIndex = this.resolveInitialCastleVariantIndex();

    this.width = this.scale.width;
    this.height = this.scale.height;
    this.uiLeft = 0;
    this.uiTop = 84;
    this.uiBottom = 200;
    this.playArea = {
      x: this.uiLeft,
      y: this.uiTop,
      width: this.width - this.uiLeft,
      height: this.height - this.uiTop - this.uiBottom
    };

    this.layoutProfile = createDefaultLayoutProfile();
    this.loadLayoutProfile();
    this.computeBoardLayout();

    this.bridgeVisuals = [];
    const simSeed = this.resolveSimSeed();
    const simStepMs = 50;
    this.ecsBridge = new GameSceneBridge(this, { seed: simSeed, stepMs: simStepMs });
    this.simClock = new SimClock({ stepMs: simStepMs });
    this.createBackground();
    this.createBridge();
    this.createCastles();
    this.createTurrets();

    // Systems
    this.economy = new EconomySystem(this);
    this.shopManager = new ShopManager(this, () => this.ecsBridge.world.sim.rng.nextFloat());
    this.waveManager = new WaveManager(this);
    this.aiController = new AIController(this);

    // Dev tools
    this.layoutDevTool = new LayoutDevTool(this);
    this.layoutDevTool.setup();
    this.unitDevTool = new UnitDevTool(this);
    this.unitDevTool.setup();

    if (this.input.keyboard) {
      this.timeScaleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    }

    this.events.once("shutdown", () => {
      this.ecsBridge.destroy();
      this.layoutDevTool.destroy();
      this.unitDevTool.destroy();
    });

    this.isGameOver = false;
    this.lastCastleHitLog = { player: 0, ai: 0 };
    this.lastCastleHp = {
      player: this.getCastleHealth(SIDE.PLAYER),
      ai: this.getCastleHealth(SIDE.AI)
    };
    this.matchTime = 0;

    this.zoneOwner = "neutral";

    this.abilityCooldowns = {
      healWave: 0,
      pulse: 0
    };

    const stageIndex = this.waveManager.getStageIndex(0);
    this.shopManager.rollOffers(SIDE.PLAYER, stageIndex, true);
    this.shopManager.rollOffers(SIDE.AI, stageIndex, true);

    // this.ghostAlpha = 0.35;
    // this.createGhostFormation();

    this.economy.emitResourceUpdate();

    this.aiController.setup();

    this.events.on("spawn-request", (type: string) => this.requestSpawn(type));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events.on("queue-add", (payload: any) => {
      const stageIdx = this.waveManager.getStageIndex(this.matchTime);
      this.waveManager.queueUnit(payload, SIDE.PLAYER, this.economy, this.shopManager, stageIdx);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events.on("queue-remove", (payload: any) => this.waveManager.removeQueuedUnit(payload, SIDE.PLAYER));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events.on("queue-move", (payload: any) => this.waveManager.moveQueuedUnit(payload, SIDE.PLAYER));
    this.events.on("shop-reroll", () => {
      const stageIdx = this.waveManager.getStageIndex(this.matchTime);
      this.shopManager.requestReroll(SIDE.PLAYER, this.economy, stageIdx);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events.on("stance-select", (payload: any) => this.waveManager.selectStance(payload, SIDE.PLAYER));
    this.events.on("ability-request", (id: AbilityId) => this.requestAbility(id));

    this.emitUiState();
  }

  // Proxy properties for backward compatibility with systems/UI
  get playerResources(): number {
    return this.economy.playerResources;
  }
  set playerResources(v: number) {
    this.economy.playerResources = v;
  }
  get aiResources(): number {
    return this.economy.aiResources;
  }
  set aiResources(v: number) {
    this.economy.aiResources = v;
  }
  get waveNumber(): number {
    return this.waveManager.waveNumber;
  }
  set waveNumber(v: number) {
    this.waveManager.waveNumber = v;
  }
  get waveCountdown(): number {
    return this.waveManager.waveCountdown;
  }
  set waveCountdown(v: number) {
    this.waveManager.waveCountdown = v;
  }

  get waveSupply(): number {
    return this.waveManager.waveSupply;
  }
  get waveSlots(): WaveSlots {
    return this.waveManager.waveSlots;
  }
  get playerDraft(): WaveDraft {
    return this.waveManager.playerDraft;
  }
  get controlPoints(): ControlPoint[] {
    return this._controlPoints || [];
  }
  set controlPoints(v: ControlPoint[]) {
    this._controlPoints = v;
  }

  resolveSimSeed(): number {
    if (typeof window !== "undefined") {
      try {
        const query = new URLSearchParams(window.location.search).get("seed");
        if (query !== null) {
          const parsed = Number(query);
          if (Number.isFinite(parsed)) {
            return parsed >>> 0;
          }
        }
      } catch {
        // ignore invalid query
      }
    }

    return Math.floor(Date.now()) >>> 0;
  }

  resolveInitialCastleVariantIndex(): number {
    const max = CASTLE_VARIANTS.length;
    if (typeof window !== "undefined") {
      try {
        const query = new URLSearchParams(window.location.search).get("castleVariant");
        const numeric = Number(query);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= max) {
          return numeric - 1;
        }
      } catch {
        // ignore invalid query
      }

      try {
        const stored = Number(window.localStorage.getItem("castleVariantIndex"));
        if (!Number.isNaN(stored) && stored >= 0 && stored < max) {
          return stored;
        }
      } catch {
        // ignore storage issues
      }
    }
    return 0;
  }

  getCastleVariant(): { label: string; baseKey: string; useTwinMirror: boolean } {
    const variant = this.castleVariants[this.castleVariantIndex] || this.castleVariants[0];
    const hasVariantBase = variant && this.textures.exists(variant.baseKey);
    return {
      label: hasVariantBase ? variant.label : "Legacy",
      baseKey: hasVariantBase ? variant.baseKey : "castle_base_player",
      useTwinMirror: hasVariantBase
    };
  }

  update(_: number, deltaMs: number): void {
    this.layoutDevTool.handleInput();
    this.unitDevTool.handleInput();

    if (this.timeScaleKey && Phaser.Input.Keyboard.JustDown(this.timeScaleKey)) {
      this.simClock.timeScale = this.simClock.timeScale === 1.0 ? 2.0 : 1.0;

      console.log(`Time scale: ${this.simClock.timeScale}x`);
      this.events.emit("log", { type: "system", text: `Time scale: ${this.simClock.timeScale}x` });
    }
    if (this.layoutDevTool.enabled) {
      this.emitUiState();
      return;
    }

    if (this.isGameOver) return;

    this.simClock.pushFrame(deltaMs);
    let simulated = false;
    while (this.simClock.consumeTick()) {
      this.runSimulationTick();
      simulated = true;
    }

    if (simulated) {
      // this.updateGhostFormation();
      this.refreshControlPointVisuals();
      this.checkGameOver();
      this.updateCastleHud();
    }
    this.emitUiState();
  }

  private runSimulationTick(): void {
    const delta = this.simClock.stepSeconds;
    this.ecsBridge.update(delta, this.simClock.elapsedMs);

    this.matchTime += delta;
    this.economy.update(delta);

    // Deterministic wave spawning
    this.waveManager.update(delta, (type, side, opts) => this.spawnUnit(type, side, opts));

    this.abilityCooldowns.healWave = Math.max(0, this.abilityCooldowns.healWave - delta);
    this.abilityCooldowns.pulse = Math.max(0, this.abilityCooldowns.pulse - delta);

    this.waveManager.waveCountdown -= delta;
    while (this.waveManager.waveCountdown <= 0) {
      if (this.waveManager.waveNumber >= WAVE_CONFIG.maxWaves) {
        this.checkGameOver(true);
        this.waveManager.waveCountdown = 999999;
        return;
      }

      this.waveManager.waveNumber += 1;
      this.waveManager.sendWave(SIDE.PLAYER);
      this.waveManager.sendWave(SIDE.AI);
      const stageIndex = this.waveManager.getStageIndex(this.matchTime);
      this.shopManager.rollOffers(SIDE.PLAYER, stageIndex, true);
      this.shopManager.rollOffers(SIDE.AI, stageIndex, true);
      this.waveManager.waveCountdown += this.waveManager.getWaveInterval(this.matchTime);
    }
  }

  // --- Background & Bridge ---

  createBackground(): void {
    const hasBgSky = this.textures.exists("env_skybox");

    this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x151922).setDepth(DEPTH.SKYBOX);

    const sky = hasBgSky
      ? this.add.image(this.width / 2, this.height / 2, "env_skybox")
      : this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x273145);

    if (hasBgSky) {
      const frame = this.textures.get("env_skybox").getSourceImage() as HTMLImageElement;
      const width = frame.width;
      const height = frame.height;

      const screenAspect = this.width / this.height;
      const imageAspect = width / height;

      // Calculate "cover" scale
      const scaleX = (this.width + 2) / width;
      const scaleY = (this.height + 2) / height;
      const scale = Math.max(scaleX, scaleY);

      (sky as Phaser.GameObjects.Image).setScale(scale).setOrigin(0.5, 0.5);
    }
    sky.setDepth(DEPTH.BACKGROUND);

    const vignette = this.add
      .rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x0d1016, 0.15)
      .setDepth(DEPTH.UI);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  createBridgeSprites(): void {
    // Destroy existing bridge sprites if any
    if (this.bridgeSpriteImage1) {
      this.bridgeSpriteImage1.destroy();
      this.bridgeSpriteImage1 = null;
    }
    if (this.bridgeSpriteImage2) {
      this.bridgeSpriteImage2.destroy();
      this.bridgeSpriteImage2 = null;
    }

    if (!this.textures.exists("bridge_sprite")) return;

    const frame = this.textures.get("bridge_sprite").getSourceImage() as HTMLImageElement;
    const nativeWidth = frame.width;
    const nativeHeight = frame.height;

    // Create first bridge sprite
    const profile1 = this.layoutProfile.bridgeSprite1;
    this.bridgeSpriteImage1 = this.add
      .image(profile1.x, profile1.y, "bridge_sprite")
      .setDisplaySize(nativeWidth * profile1.scale, nativeHeight * profile1.scale)
      .setDepth(DEPTH.BRIDGE_SPRITE);

    // Create second bridge sprite
    const profile2 = this.layoutProfile.bridgeSprite2;
    this.bridgeSpriteImage2 = this.add
      .image(profile2.x, profile2.y, "bridge_sprite")
      .setDisplaySize(nativeWidth * profile2.scale, nativeHeight * profile2.scale)
      .setDepth(DEPTH.BRIDGE_SPRITE);
  }

  createBridge(): void {
    this.clearBridgeVisuals();
    this.createBridgeSprites();

    // Use control bounds for positioning
    const controlWidth = this.controlEndX - this.controlStartX;

    // Control points use control bounds
    this._controlPoints = [];
    this.controlPointEids = [];
    const pointCount = CONTROL_POINT_CONFIG.count;
    const spacing = controlWidth / (pointCount + 1);
    for (let i = 0; i < pointCount; i += 1) {
      const x = this.controlStartX + spacing * (i + 1);
      const y = this.controlY;
      const marker = this.addBridgeVisual(
        this.add.circle(x, y, 10, 0x323844, 0.8).setStrokeStyle(2, 0x5b616e, 1)
      ) as Phaser.GameObjects.Arc;
      const core = this.addBridgeVisual(this.add.circle(x, y, 5, 0x7b8598, 0.9)) as Phaser.GameObjects.Arc;
      marker.setDepth(DEPTH.CONTROL_POINT);
      core.setDepth(DEPTH.CONTROL_POINT + 1);
      this._controlPoints.push({
        index: i,
        x,
        y,
        owner: "neutral",
        progress: 0,
        glow: null,
        rune: null,
        marker,
        core,
        zone: new Phaser.Geom.Rectangle(
          x - this.controlZoneWidth / 2,
          y - this.controlZoneHeight / 2,
          this.controlZoneWidth,
          this.controlZoneHeight
        )
      });

      if (this.ecsBridge?.world) {
        const eid = createControlPoint(this.ecsBridge.world, { x, y, owner: "neutral" });
        this.controlPointEids.push(eid);
      }
    }
  }

  // --- Castle & Turret Management ---

  createCastles(): void {
    const y = this.castleAnchorY;
    this.destroyCastles();

    this.playerCastleEid = createCastle(this.ecsBridge.world, {
      side: SIDE.PLAYER,
      x: this.castleXLeft,
      y
    });
    createCastleVisuals({
      scene: this,
      eid: this.playerCastleEid,
      side: SIDE.PLAYER,
      layoutProfile: this.layoutProfile,
      baseColor: 0x5f7685,
      renderStore: this.ecsBridge.renderStore,
      castleMode: CASTLE_MODE,
      getCastleVariant: () => this.getCastleVariant()
    });

    this.aiCastleEid = createCastle(this.ecsBridge.world, {
      side: SIDE.AI,
      x: this.castleXRight,
      y
    });
    createCastleVisuals({
      scene: this,
      eid: this.aiCastleEid,
      side: SIDE.AI,
      layoutProfile: this.layoutProfile,
      baseColor: 0x8a5a5a,
      renderStore: this.ecsBridge.renderStore,
      castleMode: CASTLE_MODE,
      getCastleVariant: () => this.getCastleVariant()
    });

    this.lastCastleHp = {
      player: this.getCastleHealth(SIDE.PLAYER),
      ai: this.getCastleHealth(SIDE.AI)
    };
  }

  logCastleHit(side: Side): void {
    const key = side === SIDE.PLAYER ? "player" : "ai";
    const now = this.time.now;
    if (now - this.lastCastleHitLog[key] > CASTLE_CONFIG.hitLogCooldown) {
      this.lastCastleHitLog[key] = now;
      this.events.emit("log", { type: "castle-hit", side });
    }
  }

  createTurrets(): void {
    this.destroyTurrets();
    const mirrorCenterX = this.width / 2;

    // Player turret uses absolute position
    this.playerTurretEid = createTurret(this.ecsBridge.world, {
      side: SIDE.PLAYER,
      x: this.turretX,
      y: this.turretY
    });
    createTurretVisuals({
      scene: this,
      eid: this.playerTurretEid,
      side: SIDE.PLAYER,
      metrics: this.layoutProfile.turret,
      renderStore: this.ecsBridge.renderStore
    });

    // AI turret is mirrored from player turret
    const aiTurretX = mirrorCenterX * 2 - this.turretX;
    this.aiTurretEid = createTurret(this.ecsBridge.world, {
      side: SIDE.AI,
      x: aiTurretX,
      y: this.turretY
    });
    createTurretVisuals({
      scene: this,
      eid: this.aiTurretEid,
      side: SIDE.AI,
      metrics: this.layoutProfile.turret,
      renderStore: this.ecsBridge.renderStore
    });
  }

  // --- Unit Spawning ---

  requestSpawn(type: string): void {
    this.spawnDevUnits(type, SIDE.PLAYER, 1);
  }

  spawnDevUnits(type: string, side: Side = SIDE.PLAYER, count = 1): boolean {
    if (this.isGameOver) return false;
    if (!UNIT_TYPES[type]) return false;
    const total = Phaser.Math.Clamp(Number(count) || 1, 1, 24);
    let spawned = 0;
    for (let i = 0; i < total; i += 1) {
      const offset = (i - (total - 1) / 2) * COMBAT_CONFIG.spawnSpread;
      const ok = this.spawnUnit(type, side, {
        payCost: false,
        offset,
        presenceMult: 1,
        modifiers: {}
      });
      if (ok) spawned += 1;
    }
    return spawned > 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spawnUnit(type: string, side: Side, options: any = {}): boolean {
    if (this.isGameOver) return false;
    const { payCost = true, offset = 0, presenceMult = 1, modifiers = {} } = options;
    const config = UNIT_TYPES[type];
    if (!config) return false;
    const cost = config.cost;
    if (payCost) {
      if (!this.economy.spend(side, cost)) return false;
    }

    // Units spawn at per-side spawn points
    const spawnX = side === SIDE.PLAYER ? this.spawnXPlayer : this.spawnXAI;
    const eid = createUnit(this.ecsBridge.world, {
      config,
      side,
      x: spawnX + offset,
      y: this.laneY,
      modifiers,
      presenceMult,
      configStore: this.ecsBridge.configStore,
      pool: this.ecsBridge.unitPool
    });
    createUnitVisuals(this, eid, config, side, this.ecsBridge.renderStore);

    this.spawnPulse(spawnX + offset, this.laneY, config.color);
    this.spawnCallout(spawnX + offset, this.laneY + this.laneCalloutOffsetY, config.name, side);
    this.events.emit("log", { type: "spawn", side, name: config.name });
    if (payCost) this.economy.emitResourceUpdate();
    return true;
  }

  spawnPulse(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 10, color, 0.4);
    this.tweens.add({
      targets: ring,
      radius: COMBAT_CONFIG.spawnPulseRadius,
      alpha: 0,
      duration: COMBAT_CONFIG.spawnPulseDuration,
      onComplete: () => ring.destroy()
    });
  }

  spawnCallout(x: number, y: number, text: string, side: Side): void {
    const label = this.add.text(x, y, text, {
      fontFamily: "Cinzel",
      fontSize: "14px",
      color: side === SIDE.PLAYER ? "#e7e2d8" : "#f4d2c4"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: y - COMBAT_CONFIG.calloutRiseDistance,
      alpha: 0,
      duration: COMBAT_CONFIG.calloutDuration,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy()
    });
  }

  // --- Abilities ---

  requestAbility(id: AbilityId): void {
    if (this.isGameOver) return;
    const ability = ABILITIES[id];
    if (!ability) return;
    if (this.abilityCooldowns[id] > 0) return;
    this.abilityCooldowns[id] = ability.cooldown;

    if (id === "healWave") {
      this.castleHealWave(SIDE.PLAYER, ability as import("../types").HealWaveAbility);
    }
    if (id === "pulse") {
      this.castlePulse(SIDE.PLAYER, ability as import("../types").PulseAbility);
    }
    this.events.emit("log", { type: "ability", name: ability.name });
  }

  castleHealWave(side: Side, ability: import("../types").HealWaveAbility): void {
    const castlePos = this.getCastlePosition(side);
    if (!castlePos) return;
    const radius = Math.max(this.playArea.width, this.playArea.height) * 0.75;
    const wave = this.add.circle(castlePos.x, castlePos.y, 20, 0x9fd6aa, 0.5);
    this.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: 500,
      onComplete: () => wave.destroy()
    });

    const label = this.add.text(castlePos.x, castlePos.y - 90, "Heal Wave", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#dff1da"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });

    // Use centralized pipeline
    const world = this.ecsBridge.world;
    const entities = unitEntitiesQuery(world);
    const pipeline = world.sim.pipeline;
    const castleEid = side === SIDE.PLAYER ? this.playerCastleEid : this.aiCastleEid;

    for (const eid of entities) {
      if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
      if (Faction.value[eid] !== FACTION.PLAYER) continue;
      if (Health.current[eid] <= 0) continue;

      // Use pipeline instead of direct mutation
      pipeline.applyHeal(world, castleEid, eid, ability.amount);
    }
  }

  castlePulse(side: Side, ability: import("../types").PulseAbility): void {
    const castlePos = this.getCastlePosition(side);
    if (!castlePos) return;
    const zone = this.getPlatformZone(SIDE.PLAYER, 40);
    const centerX = zone.x + zone.width / 2;
    const pulse = this.add.circle(centerX, castlePos.y, 30, 0xffd58a, 0.4);
    this.tweens.add({
      targets: pulse,
      radius: zone.width * 0.6,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy()
    });

    const label = this.add.text(castlePos.x, castlePos.y - 90, "Defensive Pulse", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#f2ddae"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });

    const world = this.ecsBridge.world;
    const entities = unitEntitiesQuery(world);

    for (const eid of entities) {
      if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
      if (Faction.value[eid] !== FACTION.AI) continue;
      if (Health.current[eid] <= 0) continue;
      if (!Phaser.Geom.Rectangle.Contains(zone, Position.x[eid], Position.y[eid])) continue;

      StatusEffects.stunTimer[eid] = Math.max(StatusEffects.stunTimer[eid], ability.stunDuration);
      const direction = side === SIDE.PLAYER ? 1 : -1;
      Position.x[eid] += direction * ability.pushStrength;
    }
  }

  // --- Control Points ---

  refreshControlPointVisuals(): void {
    for (const point of this.controlPoints) {
      const tint = point.owner === SIDE.PLAYER ? 0x6fa3d4 : point.owner === SIDE.AI ? 0xb36a6a : 0x3a3f4f;
      point.marker.setFillStyle(tint, 0.65);
      const coreTint = point.owner === SIDE.PLAYER ? 0x9ec9f0 : point.owner === SIDE.AI ? 0xf0b5b5 : 0x7b8598;
      point.core.setFillStyle(coreTint, 0.9);
      if (point.rune) {
        point.rune.setTint(coreTint);
        point.rune.setAlpha(0.8);
      }
      if (point.glow) {
        point.glow.setTint(tint);
        point.glow.setAlpha(point.owner === "neutral" ? 0.35 : 0.6);
      }
    }
  }

  onControlPointOwnerChanged(point: ControlPoint, _previousOwner: Side | "neutral"): void {
    this.events.emit("log", { type: "point", index: point.index, owner: point.owner });
    const pulseTargets: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image)[] = [point.marker];
    if (point.rune) pulseTargets.push(point.rune);
    if (point.glow) pulseTargets.push(point.glow);
    this.tweens.add({ targets: pulseTargets, alpha: 0.95, duration: 140, yoyo: true });
  }

  onZoneOwnerChanged(owner: Side | "neutral", _previousOwner: Side | "neutral"): void {
    if (owner !== this.zoneOwner) {
      this.zoneOwner = owner;
      this.events.emit("zone-update", this.zoneOwner);
      this.events.emit("log", { type: "zone", owner: this.zoneOwner });
      this.cameras.main.shake(CONTROL_POINT_CONFIG.zoneShakeDuration, CONTROL_POINT_CONFIG.zoneShakeIntensity);
    }
  }

  // --- Ghost Formation ---

  createGhostFormation(): void {
    const rows = ["front", "mid", "rear"] as const;
    this.ghostFormation = { rows: { front: [], mid: [], rear: [] } };
    for (const row of rows) {
      const count = this.waveSlots[row] || 0;
      this.ghostFormation.rows[row] = [];
      for (let i = 0; i < count; i += 1) {
        const container = this.add.container(0, 0);
        container.setAlpha(this.ghostAlpha);
        container.setDepth(DEPTH.UNITS);
        container.setVisible(false);
        this.ghostFormation.rows[row].push({ container, currentType: null });
      }
    }
  }

  updateGhostFormation(): void {
    if (!this.ghostFormation) return;
    const draft = this.playerDraft;
    const zone = this.getPlatformZone(SIDE.PLAYER, 0);
    const rows = ["front", "mid", "rear"] as const;

    const rowX = {
      rear: zone.x + zone.width * 0.22,
      mid: zone.x + zone.width * 0.5,
      front: zone.x + zone.width * 0.78
    };

    for (const row of rows) {
      const slots = this.waveSlots[row] || 0;
      const padding = 8;
      const step = slots > 0 ? (zone.height - padding * 2) / slots : 0;
      const list = draft[row] || [];
      const ghosts = this.ghostFormation.rows[row] || [];
      for (let i = 0; i < ghosts.length; i += 1) {
        const ghost = ghosts[i];
        const typeId = list[i];
        const x = rowX[row];
        const y = zone.y + padding + step * (i + 0.5);
        ghost.container.setPosition(x, y);
        if (!typeId) {
          ghost.container.setVisible(false);
          ghost.currentType = null;
          continue;
        }
        if (ghost.currentType !== typeId) {
          ghost.container.removeAll(true);
          const shapes = buildGhostShapes(this, typeId, UNIT_TYPES);
          ghost.container.add(shapes);
          ghost.currentType = typeId;
        }
        ghost.container.setVisible(true);
      }
    }
  }

  // --- UI State ---

  getIncomeDetails(side: Side): IncomeDetails {
    return this.economy.getIncomeDetails(side);
  }

  getRerollCost(side: Side): number {
    return this.shopManager.getRerollCost(side);
  }

  getWaveInterval(elapsed: number): number {
    return this.waveManager.getWaveInterval(elapsed);
  }

  buildUiState(): UiState {
    const stageIndex = this.waveManager.getStageIndex(this.matchTime);
    return {
      playerResources: this.economy.playerResources,
      playerIncome: this.economy.getIncomeDetails(SIDE.PLAYER).total,
      aiResources: this.economy.aiResources,
      aiIncome: this.economy.getIncomeDetails(SIDE.AI).total,
      playerCastle: {
        hp: this.getCastleHealth(SIDE.PLAYER),
        maxHp: this.getCastleMaxHp(SIDE.PLAYER)
      },
      aiCastle: {
        hp: this.getCastleHealth(SIDE.AI),
        maxHp: this.getCastleMaxHp(SIDE.AI)
      },
      controlPoints: (this.controlPoints || []).map((point) => point.owner),
      wave: {
        countdown: this.waveManager.waveCountdown,
        interval: this.waveManager.getWaveInterval(this.matchTime || 0),
        number: this.waveManager.waveNumber || 0,
        phaseLabel: this.waveManager.getPhaseLabel(this.matchTime),
        stageIndex,
        unlockedColumns: this.waveManager.getUnlockedColumns(stageIndex)
      },
      shop: {
        offers: this.shopManager.getShop(SIDE.PLAYER)?.offers || [],
        rerollCost: this.shopManager.getRerollCost(SIDE.PLAYER),
        canReroll: this.economy.canAfford(SIDE.PLAYER, this.shopManager.getRerollCost(SIDE.PLAYER)) && !this.isGameOver
      },
      waveDraft: this.waveManager.playerDraft,
      waveSupply: this.waveManager.waveSupply,
      waveSlots: this.waveManager.waveSlots,
      waveStance: this.waveManager.waveStance?.[SIDE.PLAYER] || "normal",
      abilityCooldowns: this.abilityCooldowns,
      isGameOver: this.isGameOver
    };
  }

  emitUiState(): void {
    const legacyState = this.buildUiState();
    const ecsState = this.ecsBridge?.uiStateBridge?.buildState(legacyState) ?? legacyState;
    this.events.emit("ui-state", ecsState);
  }

  getCastleEidByFaction(faction: number): number | null {
    if (faction === FACTION.PLAYER) return this.playerCastleEid || null;
    if (faction === FACTION.AI) return this.aiCastleEid || null;
    return null;
  }

  getEntityX(eid: number): number | null {
    if (!eid) return null;
    return Position.x[eid];
  }

  getCastleHealth(side: Side): number {
    const eid = side === SIDE.PLAYER ? this.playerCastleEid : this.aiCastleEid;
    if (!eid) return 0;
    return Health.current[eid] || 0;
  }

  getCastleMaxHp(side: Side): number {
    const eid = side === SIDE.PLAYER ? this.playerCastleEid : this.aiCastleEid;
    if (!eid) return 1;
    return Health.max[eid] || 1;
  }

  getCastlePosition(side: Side): { x: number; y: number } | null {
    const eid = side === SIDE.PLAYER ? this.playerCastleEid : this.aiCastleEid;
    if (!eid) return null;
    return { x: Position.x[eid], y: Position.y[eid] };
  }

  handleEntityCleanup(eid: number): void {
    if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) return;
    const killer = Faction.value[eid] === FACTION.PLAYER ? SIDE.AI : SIDE.PLAYER;
    this.economy.addKillBounty(killer, 1);
  }

  updateCastleHud(): void {
    this.trackCastleDamage();
    const renderStore = this.ecsBridge.renderStore;
    const sides: Side[] = [SIDE.PLAYER, SIDE.AI];

    for (const side of sides) {
      const eid = side === SIDE.PLAYER ? this.playerCastleEid : this.aiCastleEid;
      if (!eid) continue;
      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData?.healthFill) continue;

      const maxHp = Health.max[eid] || 1;
      const ratio = Phaser.Math.Clamp(Health.current[eid] / maxHp, 0, 1);
      const fillColor = ratio > 0.65 ? 0x79d27e : ratio > 0.35 ? 0xf0be64 : 0xd96c6c;
      if (renderData.healthFill.setFillStyle) {
        renderData.healthFill.setFillStyle(fillColor, 1);
      }
    }
  }

  trackCastleDamage(): void {
    const playerHp = this.getCastleHealth(SIDE.PLAYER);
    const aiHp = this.getCastleHealth(SIDE.AI);

    if (playerHp < this.lastCastleHp.player) {
      this.logCastleHit(SIDE.PLAYER);
    }
    if (aiHp < this.lastCastleHp.ai) {
      this.logCastleHit(SIDE.AI);
    }

    this.lastCastleHp = { player: playerHp, ai: aiHp };
  }

  destroyEcsEntity(eid: number): void {
    if (!eid) return;
    const storeIndex = Render.storeIndex[eid];
    if (storeIndex) {
      this.ecsBridge.renderStore.delete(storeIndex);
    }
    removeEntity(this.ecsBridge.world, eid);
  }

  destroyControlPointEntities(): void {
    if (!this.controlPointEids?.length) return;
    for (const eid of this.controlPointEids) {
      if (!eid) continue;
      removeEntity(this.ecsBridge.world, eid);
    }
    this.controlPointEids = [];
  }

  // --- Utility ---

  getPlatformZone(side: Side, extra = 0): Phaser.Geom.Rectangle {
    const height = 90;
    const mirrorCenterX = this.width / 2;
    if (side === SIDE.PLAYER) {
      return new Phaser.Geom.Rectangle(
        this.laneStartX,
        this.laneY - height / 2,
        this.laneEndX - this.laneStartX + extra,
        height
      );
    }
    // Mirror for AI side
    const aiLaneEndX = mirrorCenterX * 2 - this.laneStartX;
    const aiLaneStartX = mirrorCenterX * 2 - this.laneEndX;
    return new Phaser.Geom.Rectangle(
      aiLaneStartX - extra,
      this.laneY - height / 2,
      aiLaneEndX - aiLaneStartX + extra,
      height
    );
  }

  checkGameOver(forceEnd = false): void {
    const playerHp = this.getCastleHealth(SIDE.PLAYER);
    const aiHp = this.getCastleHealth(SIDE.AI);

    if (forceEnd || playerHp <= 0 || aiHp <= 0) {
      if (this.isGameOver) return;
      this.isGameOver = true;

      let winner = "Tie";
      if (playerHp <= 0 && aiHp > 0) winner = "AI";
      else if (aiHp <= 0 && playerHp > 0) winner = "Player";
      else if (playerHp > aiHp) winner = "Player";
      else if (aiHp > playerHp) winner = "AI";

      this.events.emit("game-over", winner);
      this.time.addEvent({
        delay: 100,
        callback: () => {
          this.clearCombatUnits();
        }
      });
    }
  }

  clearCombatUnits(): void {
    const world = this.ecsBridge.world;
    const entities = unitEntitiesQuery(world);
    for (const eid of entities) {
      if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
      const storeIndex = Render.storeIndex[eid];
      if (storeIndex) {
        this.ecsBridge.renderStore.delete(storeIndex);
      }
      this.ecsBridge.unitPool.release(world, eid);
    }
  }

  // --- Layout ---

  computeBoardLayout(): void {
    const profile = this.layoutProfile;
    const mirrorCenterX = this.playArea.x + this.playArea.width / 2;
    const mirrorX = (x: number) => mirrorCenterX * 2 - x;

    if (profile.mirrorMode) {
      profile.castle.aiX = mirrorX(profile.castle.playerX);
      profile.decks.foundation.rightStart = mirrorX(profile.decks.foundation.leftEnd);
      profile.decks.foundation.rightEnd = mirrorX(profile.decks.foundation.leftStart);
      profile.decks.spawn.rightStart = mirrorX(profile.decks.spawn.leftEnd);
      profile.decks.spawn.rightEnd = mirrorX(profile.decks.spawn.leftStart);
    }

    profile.spawn.aiX = mirrorX(profile.spawn.playerX);
    profile.lane.endX = mirrorX(profile.lane.startX);
    profile.control.endX = mirrorX(profile.control.startX);

    profile.decks.foundation.leftEnd = Math.max(
      profile.decks.foundation.leftEnd,
      profile.decks.foundation.leftStart + 30
    );
    profile.decks.spawn.leftEnd = Math.max(profile.decks.spawn.leftEnd, profile.decks.spawn.leftStart + 30);
    profile.decks.foundation.rightEnd = Math.max(
      profile.decks.foundation.rightEnd,
      profile.decks.foundation.rightStart + 30
    );
    profile.decks.spawn.rightEnd = Math.max(profile.decks.spawn.rightEnd, profile.decks.spawn.rightStart + 30);

    this.castleXLeft = profile.castle.playerX;
    this.castleXRight = profile.castle.aiX;
    this.castleAnchorY = profile.castle.anchorY;

    this.castleBaseWidth = profile.castle.baseWidth;
    this.castleBaseHeight = profile.castle.baseHeight;
    this.castleBaseCenterYOffset = profile.castle.baseCenterYOffset;

    this.castleFootY =
      this.castleAnchorY + this.castleBaseCenterYOffset + this.castleBaseHeight / 2 - CASTLE_METRICS.baseFootInset;

    this.foundationDeckY = profile.decks.foundation.topY;
    this.foundationDeckHeight = profile.decks.foundation.height;
    this.spawnDeckY = profile.decks.spawn.topY;
    this.spawnDeckHeight = profile.decks.spawn.height;

    // Turret uses absolute positioning
    this.turretX = profile.turret.x;
    this.turretY = profile.turret.y;

    // Spawn points (player/ai)
    this.spawnXPlayer = profile.spawn.playerX;
    this.spawnXAI = profile.spawn.aiX;

    // Lane bounds
    this.laneStartX = profile.lane.startX;
    this.laneEndX = profile.lane.endX;
    this.laneY = profile.lane.y;
    this.laneCalloutOffsetY = profile.lane.calloutOffsetY;

    // Control bounds
    this.controlStartX = profile.control.startX;
    this.controlEndX = profile.control.endX;
    this.controlY = profile.control.y;
    this.controlZoneWidth = profile.control.zoneWidth;
    this.controlZoneHeight = profile.control.zoneHeight;

    this.boardLayout = {
      leftFoundationStart: profile.decks.foundation.leftStart,
      leftFoundationEnd: profile.decks.foundation.leftEnd,
      rightFoundationStart: profile.decks.foundation.rightStart,
      rightFoundationEnd: profile.decks.foundation.rightEnd,
      leftSpawnStart: profile.decks.spawn.leftStart,
      leftSpawnEnd: profile.decks.spawn.leftEnd,
      rightSpawnStart: profile.decks.spawn.rightStart,
      rightSpawnEnd: profile.decks.spawn.rightEnd,
      bridgeLeft: profile.decks.spawn.leftEnd,
      bridgeRight: profile.decks.spawn.rightStart
    };
  }

  loadLayoutProfile(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      this.layoutProfile = {
        ...this.layoutProfile,
        ...parsed,
        castle: { ...this.layoutProfile.castle, ...(parsed.castle || {}) },
        decks: {
          foundation: { ...this.layoutProfile.decks.foundation, ...(parsed.decks?.foundation || {}) },
          spawn: { ...this.layoutProfile.decks.spawn, ...(parsed.decks?.spawn || {}) }
        },
        bridgeSprite1: { ...this.layoutProfile.bridgeSprite1, ...(parsed.bridgeSprite1 || {}) },
        bridgeSprite2: { ...this.layoutProfile.bridgeSprite2, ...(parsed.bridgeSprite2 || {}) },
        turret: { ...this.layoutProfile.turret, ...(parsed.turret || {}) },
        spawn: { ...this.layoutProfile.spawn, ...(parsed.spawn || {}) },
        lane: { ...this.layoutProfile.lane, ...(parsed.lane || {}) },
        control: { ...this.layoutProfile.control, ...(parsed.control || {}) }
      };
    } catch {
      // ignore malformed layout storage
    }
  }

  saveLayoutProfile(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.layoutProfile));
    } catch {
      // ignore storage limits
    }
  }

  exportLayoutProfile(): string {
    const text = JSON.stringify(this.layoutProfile, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    return text;
  }

  addBridgeVisual(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.bridgeVisuals.push(obj as any);
    return obj;
  }

  clearBridgeVisuals(): void {
    for (const obj of this.bridgeVisuals || []) {
      obj.destroy();
    }
    this.bridgeVisuals = [];
  }

  destroyCastles(): void {
    const world = this.ecsBridge?.world;
    if (world && this.playerCastleEid) {
      this.destroyEcsEntity(this.playerCastleEid);
    }
    if (world && this.aiCastleEid) {
      this.destroyEcsEntity(this.aiCastleEid);
    }
    this.playerCastleEid = 0;
    this.aiCastleEid = 0;
  }

  destroyTurrets(): void {
    const world = this.ecsBridge?.world;
    if (world && this.playerTurretEid) {
      this.destroyEcsEntity(this.playerTurretEid);
    }
    if (world && this.aiTurretEid) {
      this.destroyEcsEntity(this.aiTurretEid);
    }
    this.playerTurretEid = null;
    this.aiTurretEid = null;
  }

  rebuildLayoutVisuals(): void {
    this.clearBridgeVisuals();
    this.destroyControlPointEntities();
    this.destroyCastles();
    this.destroyTurrets();
    this.createBridge();
    this.createCastles();
    this.createTurrets();
    // this.updateGhostFormation();
  }
}
