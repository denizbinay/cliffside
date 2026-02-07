import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units.js";
import { ABILITIES } from "../data/abilities.js";
import {
  SIDE,
  CASTLE_VARIANTS,
  CASTLE_METRICS,
  CASTLE_CONFIG,
  CONTROL_POINT_CONFIG,
  COMBAT_CONFIG,
  LAYOUT_STORAGE_KEY,
  createDefaultLayoutProfile
} from "../config/GameConfig.js";

import Unit from "../entities/Unit.js";
import Turret from "../entities/Turret.js";
import Castle from "../entities/Castle.js";
import EconomySystem from "../systems/EconomySystem.js";
import ShopManager from "../systems/ShopManager.js";
import WaveManager from "../systems/WaveManager.js";
import AIController from "../systems/AIController.js";
import CombatSystem from "../systems/CombatSystem.js";
import LayoutDevTool from "../devtools/LayoutDevTool.js";
import UnitDevTool from "../devtools/UnitDevTool.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
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
    this.createBackground();
    this.createBridge();
    this.createCastles();
    this.createTurrets();

    this.playerUnits = [];
    this.aiUnits = [];
    this.playerTurrets = [this.playerTurret];
    this.aiTurrets = [this.aiTurret];

    // Systems
    this.economy = new EconomySystem(this);
    this.shopManager = new ShopManager(this);
    this.waveManager = new WaveManager(this);
    this.aiController = new AIController(this);
    this.combatSystem = new CombatSystem(this);

    // Dev tools
    this.layoutDevTool = new LayoutDevTool(this);
    this.layoutDevTool.setup();
    this.unitDevTool = new UnitDevTool(this);
    this.unitDevTool.setup();

    this.events.once("shutdown", () => {
      this.layoutDevTool.destroy();
      this.unitDevTool.destroy();
    });

    this.isGameOver = false;
    this.lastCastleHitLog = { player: 0, ai: 0 };
    this.matchTime = 0;

    this.zoneOwner = "neutral";
    this.zoneCheckTimer = 0;

    this.abilityCooldowns = {
      healWave: 0,
      pulse: 0
    };

    const stageIndex = this.waveManager.getStageIndex(0);
    this.shopManager.rollOffers(SIDE.PLAYER, stageIndex, true);
    this.shopManager.rollOffers(SIDE.AI, stageIndex, true);

    this.ghostAlpha = 0.35;
    this.createGhostFormation();

    this.economy.emitResourceUpdate();

    this.aiController.setup();

    this.events.on("spawn-request", (type) => this.requestSpawn(type));
    this.events.on("queue-add", (payload) => {
      const stageIdx = this.waveManager.getStageIndex(this.matchTime);
      this.waveManager.queueUnit(payload, SIDE.PLAYER, this.economy, this.shopManager, stageIdx);
    });
    this.events.on("queue-remove", (payload) => this.waveManager.removeQueuedUnit(payload, SIDE.PLAYER));
    this.events.on("queue-move", (payload) => this.waveManager.moveQueuedUnit(payload, SIDE.PLAYER));
    this.events.on("shop-reroll", () => {
      const stageIdx = this.waveManager.getStageIndex(this.matchTime);
      this.shopManager.requestReroll(SIDE.PLAYER, this.economy, stageIdx);
    });
    this.events.on("stance-select", (payload) => this.waveManager.selectStance(payload, SIDE.PLAYER));
    this.events.on("ability-request", (id) => this.requestAbility(id));

    this.emitUiState();
  }

  // Proxy properties for backward compatibility with systems/UI
  get playerResources() { return this.economy.playerResources; }
  set playerResources(v) { this.economy.playerResources = v; }
  get aiResources() { return this.economy.aiResources; }
  set aiResources(v) { this.economy.aiResources = v; }
  get waveNumber() { return this.waveManager.waveNumber; }
  set waveNumber(v) { this.waveManager.waveNumber = v; }
  get waveCountdown() { return this.waveManager.waveCountdown; }
  set waveCountdown(v) { this.waveManager.waveCountdown = v; }
  get waveLocked() { return this.waveManager.waveLocked; }
  set waveLocked(v) { this.waveManager.waveLocked = v; }
  get waveSupply() { return this.waveManager.waveSupply; }
  get waveSlots() { return this.waveManager.waveSlots; }
  get playerDraft() { return this.waveManager.playerDraft; }
  get controlPoints() { return this._controlPoints || []; }
  set controlPoints(v) { this._controlPoints = v; }

  resolveInitialCastleVariantIndex() {
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

  getCastleVariant() {
    const variant = this.castleVariants[this.castleVariantIndex] || this.castleVariants[0];
    const hasVariantBase = variant && this.textures.exists(variant.baseKey);
    const hasVariantTower = variant && this.textures.exists(variant.towerKey);
    return {
      label: hasVariantBase ? variant.label : "Legacy",
      baseKey: hasVariantBase ? variant.baseKey : "castle_base_player",
      towerKey: hasVariantTower ? variant.towerKey : "castle_tower",
      useTwinMirror: hasVariantBase
    };
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;

    this.layoutDevTool.handleInput();
    this.unitDevTool.handleInput();
    if (this.layoutDevTool.enabled) {
      this.emitUiState();
      return;
    }

    if (this.isGameOver) return;

    this.matchTime += delta;

    this.economy.update(delta);

    this.abilityCooldowns.healWave = Math.max(0, this.abilityCooldowns.healWave - delta);
    this.abilityCooldowns.pulse = Math.max(0, this.abilityCooldowns.pulse - delta);

    this.waveManager.waveCountdown -= delta;
    this.combatSystem.applyWaveLock(this.waveManager.waveCountdown);
    while (this.waveManager.waveCountdown <= 0) {
      this.waveManager.waveNumber += 1;
      this.waveManager.sendWave(SIDE.PLAYER, (type, side, opts) => this.spawnUnit(type, side, opts));
      this.waveManager.sendWave(SIDE.AI, (type, side, opts) => this.spawnUnit(type, side, opts));
      const stageIndex = this.waveManager.getStageIndex(this.matchTime);
      this.shopManager.rollOffers(SIDE.PLAYER, stageIndex, true);
      this.shopManager.rollOffers(SIDE.AI, stageIndex, true);
      this.waveManager.waveCountdown += this.waveManager.getWaveInterval(this.matchTime);
      this.combatSystem.applyWaveLock(this.waveManager.waveCountdown);
    }

    this.combatSystem.update(delta);
    this.combatSystem.cleanupUnits();
    this.updateGhostFormation();

    this.zoneCheckTimer += delta;
    if (this.zoneCheckTimer >= CONTROL_POINT_CONFIG.checkInterval) {
      this.zoneCheckTimer = 0;
      this.updateControlPoints();
    }

    this.combatSystem.checkGameOver();
    this.playerCastle.updateHud();
    this.aiCastle.updateHud();
    this.emitUiState();
  }

  // --- Background & Bridge ---

  createBackground() {
    const hasBgSky = this.textures.exists("bg_sky");

    this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x151922).setDepth(-20);

    const sky = hasBgSky
      ? this.add.image(this.width / 2, this.height / 2, "bg_sky")
      : this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x273145);
    if (hasBgSky) {
      const frame = this.textures.get("bg_sky").getSourceImage();
      const scale = Math.max((this.width + 8) / frame.width, (this.height + 8) / frame.height);
      sky.setScale(scale);
    }
    sky.setDepth(-18);

    const vignette = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x0d1016, 0.15).setDepth(4);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  createBridge() {
    this.clearBridgeVisuals();
    const bridgeY = this.controlY;
    const bridgeThickness = this.bridgeThickness;
    const bridgePlankY = this.bridgePlankY;
    const ropeTopY = this.bridgeRopeTopY;
    const ropeBottomY = this.bridgeRopeBottomY;

    this.platformLeftStart = this.boardLayout.leftSpawnStart;
    this.platformLeftEnd = this.boardLayout.leftSpawnEnd;
    this.platformRightStart = this.boardLayout.rightSpawnStart;
    this.platformRightEnd = this.boardLayout.rightSpawnEnd;
    this.bridgeLeft = this.boardLayout.bridgeLeft;
    this.bridgeRight = this.boardLayout.bridgeRight;
    const bridgeWidth = this.bridgeRight - this.bridgeLeft;
    const bridgeCenter = this.playArea.x + this.playArea.width / 2;

    const hasPlatform = this.textures.exists("platform_stone");
    const hasBridgePlank = this.textures.exists("bridge_plank");
    const hasBridgePillar = this.textures.exists("bridge_pillar");
    const hasBridgeRope = this.textures.exists("bridge_rope");

    this.drawDeckSegment(this.boardLayout.leftFoundationStart, this.boardLayout.leftFoundationEnd, this.foundationDeckY, this.foundationDeckHeight, 1, hasPlatform);
    this.drawDeckSegment(this.boardLayout.rightFoundationStart, this.boardLayout.rightFoundationEnd, this.foundationDeckY, this.foundationDeckHeight, 1, hasPlatform);
    this.drawDeckSegment(this.platformLeftStart, this.platformLeftEnd, this.spawnDeckY, this.spawnDeckHeight, 2, hasPlatform);
    this.drawDeckSegment(this.platformRightStart, this.platformRightEnd, this.spawnDeckY, this.spawnDeckHeight, 2, hasPlatform);

    if (hasBridgePlank) {
      const segmentCount = 6;
      const segmentWidth = bridgeWidth / segmentCount;
      for (let i = 0; i < segmentCount; i += 1) {
        const x = this.bridgeLeft + segmentWidth * (i + 0.5);
        this.addBridgeVisual(this.add.image(x, bridgePlankY, "bridge_plank").setDisplaySize(segmentWidth + 2, bridgeThickness).setDepth(2));
      }
    } else {
      this.addBridgeVisual(this.add.rectangle(bridgeCenter, bridgePlankY, bridgeWidth, bridgeThickness - 6, 0x3c312c).setStrokeStyle(2, 0x241b18, 1).setDepth(2));
      this.addBridgeVisual(this.add.rectangle(bridgeCenter, bridgePlankY - bridgeThickness * 0.4, bridgeWidth - 16, 6, 0x2a211e).setDepth(2));
      this.addBridgeVisual(this.add.rectangle(bridgeCenter, bridgePlankY + bridgeThickness * 0.4, bridgeWidth - 16, 6, 0x2a211e).setDepth(2));
    }

    if (this.bridgeShowPillars) {
      for (let x = this.bridgeLeft + 20; x <= this.bridgeRight - 20; x += this.bridgePillarStep) {
        if (hasBridgePillar) {
          this.addBridgeVisual(this.add.image(x, this.bridgePillarY, "bridge_pillar").setDisplaySize(18, this.bridgePillarHeight).setDepth(2));
        } else {
          this.addBridgeVisual(this.add.rectangle(x, this.bridgePillarY, 10, this.bridgePillarHeight - 4, 0x2d2522).setDepth(2));
        }
      }
    }

    if (this.bridgeShowRopes) {
      if (hasBridgeRope) {
        this.addBridgeVisual(this.add.tileSprite(bridgeCenter, ropeTopY, bridgeWidth, 12, "bridge_rope").setDepth(3).setAlpha(0.9));
        this.addBridgeVisual(this.add.tileSprite(bridgeCenter, ropeBottomY, bridgeWidth, 12, "bridge_rope").setDepth(3).setAlpha(0.9));
      } else {
        const rope = this.addBridgeVisual(this.add.graphics().setDepth(3));
        rope.lineStyle(3, 0x1b1f27, 0.9);
        this.drawRope(rope, this.bridgeLeft, this.bridgeRight, ropeTopY - 2, 10);
        this.drawRope(rope, this.bridgeLeft, this.bridgeRight, ropeBottomY + 2, 10);
      }
    }

    this._controlPoints = [];
    const hasControlRune = this.textures.exists("control_rune");
    const hasControlGlow = this.textures.exists("control_glow");
    const pointCount = CONTROL_POINT_CONFIG.count;
    const spacing = bridgeWidth / (pointCount + 1);
    for (let i = 0; i < pointCount; i += 1) {
      const x = this.bridgeLeft + spacing * (i + 1);
      const glow = this.bridgeShowControlFx && hasControlGlow
        ? this.addBridgeVisual(this.add.image(x, bridgeY, "control_glow").setDisplaySize(36, 36).setAlpha(0.45).setDepth(3))
        : null;
      const rune = this.bridgeShowControlFx && hasControlRune
        ? this.addBridgeVisual(this.add.image(x, bridgeY, "control_rune").setDisplaySize(26, 26).setAlpha(0.85).setDepth(4))
        : null;
      const marker = this.addBridgeVisual(this.add.circle(x, bridgeY, 10, 0x323844, 0.8).setStrokeStyle(2, 0x5b616e, 1));
      const core = this.addBridgeVisual(this.add.circle(x, bridgeY, 5, 0x7b8598, 0.9));
      marker.setDepth(4);
      core.setDepth(5);
      this._controlPoints.push({
        index: i,
        x,
        y: bridgeY,
        owner: "neutral",
        progress: 0,
        glow,
        rune,
        marker,
        core,
        zone: new Phaser.Geom.Rectangle(
          x - this.controlZoneWidth / 2,
          bridgeY - this.controlZoneHeight / 2,
          this.controlZoneWidth,
          this.controlZoneHeight
        )
      });
    }
  }

  drawRope(graphics, x1, x2, y, sag) {
    const steps = 18;
    graphics.beginPath();
    graphics.moveTo(x1, y);
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = Phaser.Math.Linear(x1, x2, t);
      const yOffset = Math.sin(t * Math.PI) * sag;
      graphics.lineTo(x, y + yOffset);
    }
    graphics.strokePath();
  }

  // --- Castle & Turret Management ---

  createCastles() {
    const y = this.castleAnchorY;
    this.playerCastle = new Castle(this, this.castleXLeft, y, SIDE.PLAYER, 0x5f7685, this.layoutProfile, () => this.getCastleVariant());
    this.aiCastle = new Castle(this, this.castleXRight, y, SIDE.AI, 0x8a5a5a, this.layoutProfile, () => this.getCastleVariant());

    // Castle hit logging
    const originalPlayerTakeDamage = this.playerCastle.takeDamage.bind(this.playerCastle);
    this.playerCastle.takeDamage = (amount) => {
      originalPlayerTakeDamage(amount);
      this.logCastleHit(SIDE.PLAYER);
    };

    const originalAiTakeDamage = this.aiCastle.takeDamage.bind(this.aiCastle);
    this.aiCastle.takeDamage = (amount) => {
      originalAiTakeDamage(amount);
      this.logCastleHit(SIDE.AI);
    };
  }

  logCastleHit(side) {
    const key = side === SIDE.PLAYER ? "player" : "ai";
    const now = this.time.now;
    if (now - this.lastCastleHitLog[key] > CASTLE_CONFIG.hitLogCooldown) {
      this.lastCastleHitLog[key] = now;
      this.events.emit("log", { type: "castle-hit", side });
    }
  }

  createTurrets() {
    this.destroyTurrets();
    const offset = this.turretSideInset;
    const turretY = this.turretY;
    this.playerTurret = new Turret(this, SIDE.PLAYER, this.platformLeftEnd - offset, turretY, this.layoutProfile.turret);
    this.aiTurret = new Turret(this, SIDE.AI, this.platformRightStart + offset, turretY, this.layoutProfile.turret);
    if (this.playerTurrets) this.playerTurrets = [this.playerTurret];
    if (this.aiTurrets) this.aiTurrets = [this.aiTurret];
  }

  // --- Unit Spawning ---

  requestSpawn(type) {
    this.spawnDevUnits(type, SIDE.PLAYER, 1);
  }

  spawnDevUnits(type, side = SIDE.PLAYER, count = 1) {
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

  spawnUnit(type, side, options = {}) {
    if (this.isGameOver) return false;
    const { payCost = true, offset = 0, presenceMult = 1, modifiers = {} } = options;
    const config = UNIT_TYPES[type];
    if (!config) return false;
    const cost = config.cost;
    if (payCost) {
      if (!this.economy.spend(side, cost)) return false;
    }

    const spawnX =
      side === SIDE.PLAYER ? this.platformLeftStart + this.unitSpawnInset : this.platformRightEnd - this.unitSpawnInset;
    const unit = new Unit(this, config, side, spawnX + offset, this.unitLaneY, modifiers);
    unit.presenceMult = presenceMult;
    if (side === SIDE.PLAYER) {
      this.playerUnits.push(unit);
    } else {
      this.aiUnits.push(unit);
    }

    this.spawnPulse(spawnX + offset, this.unitLaneY, config.color);
    this.spawnCallout(spawnX + offset, this.unitLaneY + this.unitCalloutOffsetY, config.name, side);
    this.events.emit("log", { type: "spawn", side, name: config.name });
    if (payCost) this.economy.emitResourceUpdate();
    return true;
  }

  spawnPulse(x, y, color) {
    const ring = this.add.circle(x, y, 10, color, 0.4);
    this.tweens.add({
      targets: ring,
      radius: COMBAT_CONFIG.spawnPulseRadius,
      alpha: 0,
      duration: COMBAT_CONFIG.spawnPulseDuration,
      onComplete: () => ring.destroy()
    });
  }

  spawnCallout(x, y, text, side) {
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

  requestAbility(id) {
    if (this.isGameOver) return;
    const ability = ABILITIES[id];
    if (!ability) return;
    if (this.abilityCooldowns[id] > 0) return;
    this.abilityCooldowns[id] = ability.cooldown;

    if (id === "healWave") {
      this.castleHealWave(this.playerCastle, ability);
    }
    if (id === "pulse") {
      this.castlePulse(this.playerCastle, ability);
    }
    this.events.emit("log", { type: "ability", name: ability.name });
  }

  castleHealWave(castle, ability) {
    const radius = Math.max(this.playArea.width, this.playArea.height) * 0.75;
    const wave = this.add.circle(castle.x, castle.y, 20, 0x9fd6aa, 0.5);
    this.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: 500,
      onComplete: () => wave.destroy()
    });

    const label = this.add.text(castle.x, castle.y - 90, "Heal Wave", {
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

    for (const unit of this.playerUnits) {
      unit.heal(ability.amount);
    }
  }

  castlePulse(castle, ability) {
    const zone = this.getPlatformZone(SIDE.PLAYER, 40);
    const centerX = zone.x + zone.width / 2;
    const pulse = this.add.circle(centerX, castle.y, 30, 0xffd58a, 0.4);
    this.tweens.add({
      targets: pulse,
      radius: zone.width * 0.6,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy()
    });

    const label = this.add.text(castle.x, castle.y - 90, "Defensive Pulse", {
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

    for (const unit of this.aiUnits) {
      if (Phaser.Geom.Rectangle.Contains(zone, unit.body.x, unit.body.y)) {
        unit.applyStatus({ type: "stun", duration: ability.stunDuration }, SIDE.PLAYER);
        unit.applyStatus({ type: "pushback", strength: ability.pushStrength }, SIDE.PLAYER);
      }
    }
  }

  // --- Control Points ---

  updateControlPoints() {
    let playerCount = 0;
    let aiCount = 0;

    for (const point of this.controlPoints) {
      let playerPresence = 0;
      let aiPresence = 0;

      for (const unit of this.playerUnits) {
        if (!unit.isAlive()) continue;
        if (Phaser.Geom.Rectangle.Contains(point.zone, unit.body.x, unit.body.y)) {
          playerPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }
      for (const unit of this.aiUnits) {
        if (!unit.isAlive()) continue;
        if (Phaser.Geom.Rectangle.Contains(point.zone, unit.body.x, unit.body.y)) {
          aiPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }

      const diff = playerPresence - aiPresence;
      if (Math.abs(diff) <= CONTROL_POINT_CONFIG.contestDeadzone) {
        point.progress *= CONTROL_POINT_CONFIG.decayRate;
      } else {
        point.progress = Phaser.Math.Clamp(point.progress + diff * CONTROL_POINT_CONFIG.progressRate, -1, 1);
      }

      const prevOwner = point.owner;
      if (point.progress >= CONTROL_POINT_CONFIG.ownershipThreshold) point.owner = SIDE.PLAYER;
      else if (point.progress <= -CONTROL_POINT_CONFIG.ownershipThreshold) point.owner = SIDE.AI;
      else point.owner = "neutral";

      if (point.owner !== prevOwner) {
        this.events.emit("log", { type: "point", index: point.index, owner: point.owner });
        const pulseTargets = [point.marker];
        if (point.rune) pulseTargets.push(point.rune);
        if (point.glow) pulseTargets.push(point.glow);
        this.tweens.add({ targets: pulseTargets, alpha: 0.95, duration: 140, yoyo: true });
      }

      if (point.owner === SIDE.PLAYER) playerCount += 1;
      if (point.owner === SIDE.AI) aiCount += 1;

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

    let newOwner = "neutral";
    if (playerCount > aiCount) newOwner = SIDE.PLAYER;
    if (aiCount > playerCount) newOwner = SIDE.AI;

    if (newOwner !== this.zoneOwner) {
      this.zoneOwner = newOwner;
      this.events.emit("zone-update", this.zoneOwner);
      this.events.emit("log", { type: "zone", owner: this.zoneOwner });
      this.cameras.main.shake(CONTROL_POINT_CONFIG.zoneShakeDuration, CONTROL_POINT_CONFIG.zoneShakeIntensity);
    }
  }

  // --- Ghost Formation ---

  createGhostFormation() {
    const rows = ["front", "mid", "rear"];
    this.ghostFormation = { rows: {} };
    for (const row of rows) {
      const count = this.waveSlots[row] || 0;
      this.ghostFormation.rows[row] = [];
      for (let i = 0; i < count; i += 1) {
        const container = this.add.container(0, 0);
        container.setAlpha(this.ghostAlpha);
        container.setDepth(1);
        container.setVisible(false);
        this.ghostFormation.rows[row].push({ container, currentType: null });
      }
    }
  }

  updateGhostFormation() {
    if (!this.ghostFormation) return;
    const draft = this.playerDraft;
    const zone = this.getPlatformZone(SIDE.PLAYER, 0);
    const rows = ["front", "mid", "rear"];

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
          const shapes = Unit.buildGhostShapes(this, typeId, UNIT_TYPES);
          ghost.container.add(shapes);
          ghost.currentType = typeId;
        }
        ghost.container.setVisible(true);
      }
    }
  }

  // --- UI State ---

  getIncomeDetails(side) {
    return this.economy.getIncomeDetails(side);
  }

  getRerollCost(side) {
    return this.shopManager.getRerollCost(side);
  }

  getWaveInterval(elapsed) {
    return this.waveManager.getWaveInterval(elapsed);
  }

  buildUiState() {
    const stageIndex = this.waveManager.getStageIndex(this.matchTime);
    return {
      playerResources: this.economy.playerResources,
      playerIncome: this.economy.getIncomeDetails(SIDE.PLAYER).total,
      aiResources: this.economy.aiResources,
      aiIncome: this.economy.getIncomeDetails(SIDE.AI).total,
      playerCastle: {
        hp: this.playerCastle?.hp || 0,
        maxHp: this.playerCastle?.maxHp || 1
      },
      aiCastle: {
        hp: this.aiCastle?.hp || 0,
        maxHp: this.aiCastle?.maxHp || 1
      },
      controlPoints: (this.controlPoints || []).map((point) => point.owner),
      wave: {
        countdown: this.waveManager.waveCountdown,
        interval: this.waveManager.getWaveInterval(this.matchTime || 0),
        locked: this.waveManager.waveLocked,
        number: this.waveManager.waveNumber || 0,
        phaseLabel: this.waveManager.getPhaseLabel(this.matchTime),
        stageIndex,
        unlockedColumns: this.waveManager.getUnlockedColumns(stageIndex)
      },
      shop: {
        offers: this.shopManager.getShop(SIDE.PLAYER)?.offers || [],
        rerollCost: this.shopManager.getRerollCost(SIDE.PLAYER),
        canReroll: this.economy.canAfford(SIDE.PLAYER, this.shopManager.getRerollCost(SIDE.PLAYER)) && !this.isGameOver && !this.waveManager.waveLocked
      },
      waveDraft: this.waveManager.playerDraft,
      waveSupply: this.waveManager.waveSupply,
      waveSlots: this.waveManager.waveSlots,
      waveStance: this.waveManager.waveStance?.[SIDE.PLAYER] || "normal",
      abilityCooldowns: this.abilityCooldowns,
      isGameOver: this.isGameOver
    };
  }

  emitUiState() {
    this.events.emit("ui-state", this.buildUiState());
  }

  // --- Utility ---

  getPlatformZone(side, extra = 0) {
    const height = 90;
    if (side === SIDE.PLAYER) {
      return new Phaser.Geom.Rectangle(
        this.platformLeftStart,
        this.unitLaneY - height / 2,
        this.platformLeftEnd - this.platformLeftStart + extra,
        height
      );
    }
    return new Phaser.Geom.Rectangle(
      this.platformRightStart - extra,
      this.unitLaneY - height / 2,
      this.platformRightEnd - this.platformRightStart + extra,
      height
    );
  }

  cleanupUnits() {
    const beforePlayer = this.playerUnits.length;
    const beforeAi = this.aiUnits.length;

    this.playerUnits = this.playerUnits.filter((unit) => {
      if (unit.isAlive() || !unit.isReadyForCleanup()) return true;
      unit.destroy();
      return false;
    });

    this.aiUnits = this.aiUnits.filter((unit) => {
      if (unit.isAlive() || !unit.isReadyForCleanup()) return true;
      unit.destroy();
      return false;
    });

    const deadPlayer = beforePlayer - this.playerUnits.length;
    const deadAi = beforeAi - this.aiUnits.length;
    // Kill bounties: award to the side that killed the enemy units
    this.economy.addKillBounty(SIDE.AI, deadPlayer);
    this.economy.addKillBounty(SIDE.PLAYER, deadAi);
  }

  checkGameOver() {
    if (this.playerCastle.hp <= 0 || this.aiCastle.hp <= 0) {
      this.isGameOver = true;
      const winner = this.playerCastle.hp <= 0 ? "AI" : "Player";
      this.events.emit("game-over", winner);
      this.time.addEvent({
        delay: 100,
        callback: () => {
          this.playerUnits.forEach((unit) => unit.destroy());
          this.aiUnits.forEach((unit) => unit.destroy());
        }
      });
    }
  }

  clearCombatUnits() {
    for (const unit of this.playerUnits || []) unit.destroy();
    for (const unit of this.aiUnits || []) unit.destroy();
    this.playerUnits = [];
    this.aiUnits = [];
  }

  // --- Layout ---

  computeBoardLayout() {
    const profile = this.layoutProfile;
    const mirrorCenterX = this.playArea.x + this.playArea.width / 2;
    const mirrorX = (x) => mirrorCenterX * 2 - x;

    if (profile.mirrorMode) {
      profile.castle.aiX = mirrorX(profile.castle.playerX);
      profile.decks.foundation.rightStart = mirrorX(profile.decks.foundation.leftEnd);
      profile.decks.foundation.rightEnd = mirrorX(profile.decks.foundation.leftStart);
      profile.decks.spawn.rightStart = mirrorX(profile.decks.spawn.leftEnd);
      profile.decks.spawn.rightEnd = mirrorX(profile.decks.spawn.leftStart);
    }

    profile.decks.foundation.leftEnd = Math.max(profile.decks.foundation.leftEnd, profile.decks.foundation.leftStart + 30);
    profile.decks.spawn.leftEnd = Math.max(profile.decks.spawn.leftEnd, profile.decks.spawn.leftStart + 30);
    profile.decks.foundation.rightEnd = Math.max(profile.decks.foundation.rightEnd, profile.decks.foundation.rightStart + 30);
    profile.decks.spawn.rightEnd = Math.max(profile.decks.spawn.rightEnd, profile.decks.spawn.rightStart + 30);

    this.castleXLeft = profile.castle.playerX;
    this.castleXRight = profile.castle.aiX;
    this.castleAnchorY = profile.castle.anchorY;

    this.castleBaseWidth = profile.castle.baseWidth;
    this.castleBaseHeight = profile.castle.baseHeight;
    this.castleBaseCenterYOffset = profile.castle.baseCenterYOffset;

    this.castleFootY =
      this.castleAnchorY +
      this.castleBaseCenterYOffset +
      this.castleBaseHeight / 2 -
      CASTLE_METRICS.baseFootInset;

    this.foundationDeckY = profile.decks.foundation.topY;
    this.foundationDeckHeight = profile.decks.foundation.height;
    this.spawnDeckY = profile.decks.spawn.topY;
    this.spawnDeckHeight = profile.decks.spawn.height;
    this.bridgeY = profile.bridge.topY;

    this.bridgePlankY = profile.bridge.topY + profile.bridge.plankOffsetY;
    this.bridgeThickness = profile.bridge.thickness;
    this.bridgeShowPillars = Boolean(profile.bridge.showPillars);
    this.bridgeShowRopes = Boolean(profile.bridge.showRopes);
    this.bridgeShowControlFx = Boolean(profile.bridge.showControlFx);
    this.bridgeRopeTopY = profile.bridge.topY + profile.bridge.ropeTopOffset;
    this.bridgeRopeBottomY = profile.bridge.topY + profile.bridge.ropeBottomOffset;
    this.bridgePillarY = profile.bridge.topY + profile.bridge.pillarOffsetY;
    this.bridgePillarHeight = profile.bridge.pillarHeight;
    this.bridgePillarStep = profile.bridge.pillarStep;

    this.turretSideInset = profile.turret.sideInset;
    this.turretY = this.spawnDeckY + profile.turret.yOffset;

    this.unitSpawnInset = profile.units.spawnInset;
    this.unitLaneY = profile.units.laneY;
    this.unitCalloutOffsetY = profile.units.calloutOffsetY;

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

  drawDeckSegment(startX, endX, topY, height, depth, hasPlatformTexture) {
    const width = endX - startX;
    const centerX = (startX + endX) / 2;
    const centerY = topY + height / 2;
    if (hasPlatformTexture) {
      this.addBridgeVisual(this.add.image(centerX, centerY, "platform_stone").setDisplaySize(width + 16, height).setDepth(depth));
      return;
    }
    this.addBridgeVisual(this.add.rectangle(centerX, centerY, width, height, 0x3a3430).setStrokeStyle(2, 0x241b18, 1).setDepth(depth));
  }

  loadLayoutProfile() {
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
        bridge: { ...this.layoutProfile.bridge, ...(parsed.bridge || {}) },
        turret: { ...this.layoutProfile.turret, ...(parsed.turret || {}) },
        units: { ...this.layoutProfile.units, ...(parsed.units || {}) },
        control: { ...this.layoutProfile.control, ...(parsed.control || {}) }
      };
    } catch {
      // ignore malformed layout storage
    }
  }

  saveLayoutProfile() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.layoutProfile));
    } catch {
      // ignore storage limits
    }
  }

  exportLayoutProfile() {
    const text = JSON.stringify(this.layoutProfile, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    return text;
  }

  addBridgeVisual(obj) {
    this.bridgeVisuals.push(obj);
    return obj;
  }

  clearBridgeVisuals() {
    for (const obj of this.bridgeVisuals || []) {
      obj.destroy();
    }
    this.bridgeVisuals = [];
  }

  destroyCastles() {
    this.playerCastle?.destroy();
    this.aiCastle?.destroy();
    this.playerCastle = null;
    this.aiCastle = null;
  }

  destroyTurrets() {
    if (this.playerTurret) this.playerTurret.destroy();
    if (this.aiTurret) this.aiTurret.destroy();
    this.playerTurret = null;
    this.aiTurret = null;
  }

  rebuildLayoutVisuals() {
    this.clearBridgeVisuals();
    this.destroyCastles();
    this.destroyTurrets();
    this.createBridge();
    this.createCastles();
    this.createTurrets();
    this.updateGhostFormation();
  }
}
