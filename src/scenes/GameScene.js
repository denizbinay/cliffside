/**
 * GameScene - Refactored to be a thin orchestrator.
 * Responsibilities:
 * 1. Initialize GameContext
 * 2. Create managers and systems
 * 3. Run update loop
 * 4. Handle Phaser-specific scene lifecycle
 */

import Phaser from "phaser";
import { SIDE, WAVE_CONFIG } from "../config/GameConfig.js";
import { UNIT_TYPES } from "../data/units.js";
import { ABILITIES } from "../data/abilities.js";
import { GameEvents } from "../core/EventBus.js";

// Core
import GameContext from "../core/GameContext.js";

// Managers
import EntityManager from "../managers/EntityManager.js";
import LevelManager from "../managers/LevelManager.js";
import ControlPointManager from "../managers/ControlPointManager.js";

// Systems
import CombatSystem from "../systems/CombatSystem.js";
import EconomySystem from "../systems/EconomySystem.js";
import WaveManager from "../systems/WaveManager.js";
import ShopManager from "../systems/ShopManager.js";
import AIController from "../systems/AIController.js";

// Rendering
import RenderSystem from "../render/RenderSystem.js";

// Commands
import CommandQueue from "../commands/CommandQueue.js";
import CastAbilityCommand from "../commands/CastAbilityCommand.js";

// Dev Tools
import LayoutDevTool from "../devtools/LayoutDevTool.js";
import UnitDevTool from "../devtools/UnitDevTool.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    // --- Initialize GameContext ---
    this.ctx = new GameContext();
    this.ctx.bindScene(this);

    // --- Create Managers ---
    const entityManager = new EntityManager(this.ctx);
    this.ctx.registerManager("entity", entityManager);

    const levelManager = new LevelManager(this, this.ctx);
    this.ctx.registerManager("level", levelManager);

    const controlPointManager = new ControlPointManager(this.ctx);
    this.ctx.registerManager("controlPoint", controlPointManager);

    // --- Create Systems ---
    const economy = new EconomySystem(this.ctx);
    this.ctx.registerSystem("economy", economy);

    const shop = new ShopManager(this.ctx);
    this.ctx.registerSystem("shop", shop);

    const wave = new WaveManager(this.ctx);
    this.ctx.registerSystem("wave", wave);

    const combat = new CombatSystem(this.ctx);
    this.ctx.registerSystem("combat", combat);

    const ai = new AIController(this.ctx);
    this.ctx.registerSystem("ai", ai);

    // --- Create Command Queue ---
    this.commandQueue = new CommandQueue(this.ctx, { enableUndo: false });

    // --- Create Render System ---
    this.renderSystem = new RenderSystem(this.ctx, this);

    // --- Initialize Level ---
    levelManager.initialize();

    // --- Create Entities ---
    this.createInitialEntities();

    // --- Initialize Control Points ---
    const cpConfigs = levelManager.getControlPointConfigs();
    controlPointManager.initialize(cpConfigs);

    // --- Initial Shop Rolls ---
    const stageIndex = wave.getStageIndex(0);
    shop.rollOffers(SIDE.PLAYER, stageIndex, true);
    shop.rollOffers(SIDE.AI, stageIndex, true);

    // --- Setup Dev Tools ---
    this.layoutDevTool = new LayoutDevTool(this);
    this.layoutDevTool.setup();
    this.unitDevTool = new UnitDevTool(this);
    this.unitDevTool.setup();

    this.events.once("shutdown", () => {
      this.layoutDevTool.destroy();
      this.unitDevTool.destroy();
      this.renderSystem.destroy();
    });

    // --- Setup Event Listeners ---
    this.setupEventListeners();

    // --- Emit Initial State ---
    economy.emitResourceUpdate();
    this.emitUiState();
  }

  createInitialEntities() {
    const entityManager = this.ctx.getManager("entity");
    const levelManager = this.ctx.getManager("level");

    // Create castles
    const playerCastlePos = levelManager.getPlayerCastlePosition();
    entityManager.createCastle(SIDE.PLAYER, {
      x: playerCastlePos.x,
      y: playerCastlePos.y
    });

    const aiCastlePos = levelManager.getAiCastlePosition();
    entityManager.createCastle(SIDE.AI, {
      x: aiCastlePos.x,
      y: aiCastlePos.y
    });

    // Create turrets
    const playerTurretPos = levelManager.getPlayerTurretPosition();
    entityManager.createTurret(SIDE.PLAYER, {
      x: playerTurretPos.x,
      y: playerTurretPos.y,
      metrics: levelManager.layoutProfile.turret
    });

    const aiTurretPos = levelManager.getAiTurretPosition();
    entityManager.createTurret(SIDE.AI, {
      x: aiTurretPos.x,
      y: aiTurretPos.y,
      metrics: levelManager.layoutProfile.turret
    });
  }

  setupEventListeners() {
    const wave = this.ctx.getSystem("wave");
    const economy = this.ctx.getSystem("economy");
    const shop = this.ctx.getSystem("shop");

    // UI event handlers (from scene events for backward compatibility)
    this.events.on("spawn-request", (type) => this.requestSpawn(type));

    this.events.on("queue-add", (payload) => {
      const stageIdx = wave.getStageIndex(this.ctx.state.matchTime);
      wave.queueUnit(payload, SIDE.PLAYER, economy, shop, stageIdx);
    });

    this.events.on("queue-remove", (payload) => {
      wave.removeQueuedUnit(payload, SIDE.PLAYER);
    });

    this.events.on("queue-move", (payload) => {
      wave.moveQueuedUnit(payload, SIDE.PLAYER);
    });

    this.events.on("shop-reroll", () => {
      const stageIdx = wave.getStageIndex(this.ctx.state.matchTime);
      shop.requestReroll(SIDE.PLAYER, economy, stageIdx);
    });

    this.events.on("stance-select", (payload) => {
      wave.selectStance(payload, SIDE.PLAYER);
    });

    this.events.on("ability-request", (id) => this.requestAbility(id));

    // Forward EventBus events to scene events for UI compatibility
    this.ctx.events.on(GameEvents.RESOURCES_CHANGED, (data) => {
      this.events.emit("resource-update", data);
    });

    this.ctx.events.on(GameEvents.ZONE_OWNER_CHANGED, (data) => {
      this.events.emit("zone-update", data.newOwner);
      // Camera shake on zone capture
      this.cameras.main.shake(120, 0.002);
    });

    this.ctx.events.on(GameEvents.GAME_OVER, (data) => {
      this.events.emit("game-over", data.winner);
      // Cleanup units after short delay
      this.time.addEvent({
        delay: 100,
        callback: () => {
          // Units will be cleaned up by entity manager
        }
      });
    });

    this.ctx.events.on(GameEvents.LOG, (data) => {
      this.events.emit("log", data);
    });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;

    // Update time tracking
    this.ctx.updateTime(this.time.now, deltaMs);

    // Handle dev tools
    this.layoutDevTool.handleInput();
    this.unitDevTool.handleInput();

    if (this.layoutDevTool.enabled) {
      this.emitUiState();
      return;
    }

    if (this.ctx.state.isGameOver) return;

    // Update match time
    this.ctx.state.matchTime += delta;

    // Get systems
    const economy = this.ctx.getSystem("economy");
    const wave = this.ctx.getSystem("wave");
    const combat = this.ctx.getSystem("combat");
    const ai = this.ctx.getSystem("ai");
    const controlPoint = this.ctx.getManager("controlPoint");
    const entityManager = this.ctx.getManager("entity");
    const levelManager = this.ctx.getManager("level");

    // Update economy
    economy.update(delta);

    // Update ability cooldowns
    this.ctx.state.abilityCooldowns.healWave = Math.max(0, this.ctx.state.abilityCooldowns.healWave - delta);
    this.ctx.state.abilityCooldowns.pulse = Math.max(0, this.ctx.state.abilityCooldowns.pulse - delta);

    // Wave countdown and spawning
    this.ctx.state.waveCountdown -= delta;
    combat.applyWaveLock(this.ctx.state.waveCountdown);

    while (this.ctx.state.waveCountdown <= 0) {
      this.ctx.state.waveNumber += 1;
      wave.sendWave(SIDE.PLAYER, entityManager);
      wave.sendWave(SIDE.AI, entityManager);

      const stageIndex = wave.getStageIndex(this.ctx.state.matchTime);
      const shop = this.ctx.getSystem("shop");
      shop.rollOffers(SIDE.PLAYER, stageIndex, true);
      shop.rollOffers(SIDE.AI, stageIndex, true);

      this.ctx.state.waveCountdown += wave.getWaveInterval(this.ctx.state.matchTime);
      combat.applyWaveLock(this.ctx.state.waveCountdown);
    }

    // Update combat
    combat.update(delta);

    // Cleanup dead units
    const cleanup = entityManager.cleanupDeadUnits(this.ctx.time.now);
    if (cleanup.playerDead > 0) {
      economy.addKillBounty(SIDE.AI, cleanup.playerDead);
    }
    if (cleanup.aiDead > 0) {
      economy.addKillBounty(SIDE.PLAYER, cleanup.aiDead);
    }

    // Update control points
    controlPoint.update(delta);
    controlPoint.syncVisuals(levelManager);

    // Update AI
    ai.update(delta);

    // Check game over
    combat.checkGameOver();

    // Update render system
    this.renderSystem.update();

    // Emit UI state
    this.emitUiState();
  }

  // --- Actions ---

  requestSpawn(type) {
    if (this.ctx.state.isGameOver) return false;
    if (!UNIT_TYPES[type]) return false;

    const entityManager = this.ctx.getManager("entity");
    const levelManager = this.ctx.getManager("level");

    const x = levelManager.getPlayerSpawnX();
    const y = levelManager.getUnitLaneY();

    entityManager.createUnit({
      type,
      side: SIDE.PLAYER,
      x,
      y,
      presenceMult: 1,
      modifiers: {}
    });

    return true;
  }

  requestAbility(id) {
    const command = new CastAbilityCommand(this.ctx, {
      abilityId: id,
      side: SIDE.PLAYER
    });

    return this.commandQueue.execute(command);
  }

  // --- UI State ---

  buildUiState() {
    const wave = this.ctx.getSystem("wave");
    const economy = this.ctx.getSystem("economy");
    const shop = this.ctx.getSystem("shop");

    const stageIndex = wave.getStageIndex(this.ctx.state.matchTime);
    const playerCastle = this.ctx.state.getCastle(SIDE.PLAYER);
    const aiCastle = this.ctx.state.getCastle(SIDE.AI);

    return {
      playerResources: this.ctx.state.getResources(SIDE.PLAYER),
      playerIncome: economy.getIncomeDetails(SIDE.PLAYER).total,
      aiResources: this.ctx.state.getResources(SIDE.AI),
      aiIncome: economy.getIncomeDetails(SIDE.AI).total,
      playerCastle: {
        hp: playerCastle?.hp || 0,
        maxHp: playerCastle?.maxHp || 1
      },
      aiCastle: {
        hp: aiCastle?.hp || 0,
        maxHp: aiCastle?.maxHp || 1
      },
      controlPoints: this.ctx.state.getControlPoints().map((point) => point.owner),
      wave: {
        countdown: this.ctx.state.waveCountdown,
        interval: wave.getWaveInterval(this.ctx.state.matchTime),
        locked: this.ctx.state.waveLocked,
        number: this.ctx.state.waveNumber,
        phaseLabel: wave.getPhaseLabel(this.ctx.state.matchTime),
        stageIndex,
        unlockedColumns: wave.getUnlockedColumns(stageIndex)
      },
      shop: {
        offers: shop.getShop(SIDE.PLAYER)?.offers || [],
        rerollCost: shop.getRerollCost(SIDE.PLAYER),
        canReroll: economy.canAfford(SIDE.PLAYER, shop.getRerollCost(SIDE.PLAYER)) &&
          !this.ctx.state.isGameOver &&
          !this.ctx.state.waveLocked
      },
      waveDraft: wave.getDraft(SIDE.PLAYER),
      waveSupply: WAVE_CONFIG.supply,
      waveSlots: WAVE_CONFIG.slots,
      waveStance: this.ctx.state.getStance(SIDE.PLAYER),
      abilityCooldowns: this.ctx.state.abilityCooldowns,
      isGameOver: this.ctx.state.isGameOver
    };
  }

  emitUiState() {
    this.events.emit("ui-state", this.buildUiState());
  }

  // --- Compatibility getters for existing UI ---

  get playerResources() { return this.ctx.state.getResources(SIDE.PLAYER); }
  get aiResources() { return this.ctx.state.getResources(SIDE.AI); }
  get waveNumber() { return this.ctx.state.waveNumber; }
  get waveCountdown() { return this.ctx.state.waveCountdown; }
  get waveLocked() { return this.ctx.state.waveLocked; }
  get matchTime() { return this.ctx.state.matchTime; }
  get isGameOver() { return this.ctx.state.isGameOver; }

  get playerUnits() { return this.ctx.state.getUnits(SIDE.PLAYER); }
  get aiUnits() { return this.ctx.state.getUnits(SIDE.AI); }
  get playerCastle() { return this.ctx.state.getCastle(SIDE.PLAYER); }
  get aiCastle() { return this.ctx.state.getCastle(SIDE.AI); }
  get controlPoints() { return this.ctx.state.getControlPoints(); }

  get economy() { return this.ctx.getSystem("economy"); }
  get waveManager() { return this.ctx.getSystem("wave"); }
  get shopManager() { return this.ctx.getSystem("shop"); }
}
