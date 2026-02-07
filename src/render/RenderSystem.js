/**
 * RenderSystem - Orchestrates all rendering for the game.
 * Listens to EventBus for entity lifecycle events and delegates to specialized renderers.
 * This is the ONLY place where Phaser rendering code should live (besides LevelManager for static visuals).
 */

import { GameEvents } from "../core/EventBus.js";
import UnitRenderer from "./UnitRenderer.js";
import CastleRenderer from "./CastleRenderer.js";
import TurretRenderer from "./TurretRenderer.js";
import EffectsRenderer from "./EffectsRenderer.js";

export default class RenderSystem {
  /**
   * @param {GameContext} ctx - The game context
   * @param {Phaser.Scene} scene - The Phaser scene for rendering
   */
  constructor(ctx, scene) {
    this.ctx = ctx;
    this.scene = scene;
    this.events = ctx.events;

    // Entity ID -> Renderer instance mappings
    this.unitRenderers = new Map();
    this.castleRenderers = new Map();
    this.turretRenderers = new Map();

    // Effects renderer (singleton)
    this.effectsRenderer = new EffectsRenderer(scene, ctx);

    // Subscribe to events
    this.subscriptions = [];
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Entity lifecycle
    this.subscriptions.push(
      this.events.on(GameEvents.ENTITY_CREATED, (data) => this.onEntityCreated(data)),
      this.events.on(GameEvents.ENTITY_DESTROYED, (data) => this.onEntityDestroyed(data))
    );

    // Unit events
    this.subscriptions.push(
      this.events.on(GameEvents.UNIT_DAMAGED, (data) => this.onUnitDamaged(data)),
      this.events.on(GameEvents.UNIT_HEALED, (data) => this.onUnitHealed(data)),
      this.events.on(GameEvents.UNIT_DIED, (data) => this.onUnitDied(data)),
      this.events.on(GameEvents.UNIT_STATUS_APPLIED, (data) => this.onUnitStatusApplied(data))
    );

    // Castle events
    this.subscriptions.push(
      this.events.on(GameEvents.CASTLE_DAMAGED, (data) => this.onCastleDamaged(data))
    );

    // Turret events
    this.subscriptions.push(
      this.events.on(GameEvents.TURRET_FIRED, (data) => this.onTurretFired(data))
    );

    // Effect events
    this.subscriptions.push(
      this.events.on(GameEvents.EFFECT_SPAWN_PULSE, (data) => this.effectsRenderer.spawnPulse(data)),
      this.events.on(GameEvents.EFFECT_CALLOUT, (data) => this.effectsRenderer.spawnCallout(data)),
      this.events.on(GameEvents.EFFECT_FLASH, (data) => this.effectsRenderer.flash(data)),
      this.events.on(GameEvents.EFFECT_ABILITY_VISUAL, (data) => this.effectsRenderer.abilityVisual(data))
    );
  }

  // --- Entity Lifecycle ---

  onEntityCreated(data) {
    const { entityType, entity } = data;

    switch (entityType) {
      case "unit":
        this.createUnitRenderer(entity);
        break;
      case "castle":
        this.createCastleRenderer(entity);
        break;
      case "turret":
        this.createTurretRenderer(entity);
        break;
      // Control points are rendered by LevelManager (static visuals)
    }
  }

  onEntityDestroyed(data) {
    const { entityType, entity } = data;

    switch (entityType) {
      case "unit":
        this.destroyUnitRenderer(entity.id);
        break;
      case "castle":
        this.destroyCastleRenderer(entity.id);
        break;
      case "turret":
        this.destroyTurretRenderer(entity.id);
        break;
    }
  }

  // --- Unit Rendering ---

  createUnitRenderer(unit) {
    const renderer = new UnitRenderer(this.scene, unit, this.ctx);
    this.unitRenderers.set(unit.id, renderer);
    return renderer;
  }

  destroyUnitRenderer(unitId) {
    const renderer = this.unitRenderers.get(unitId);
    if (renderer) {
      renderer.destroy();
      this.unitRenderers.delete(unitId);
    }
  }

  onUnitDamaged(data) {
    const renderer = this.unitRenderers.get(data.unit.id);
    if (renderer) {
      renderer.flash(0xffc2c2);
      if (data.unit.hp > 0) {
        renderer.playAnimation("hit", true);
      }
    }
  }

  onUnitHealed(data) {
    const renderer = this.unitRenderers.get(data.unit.id);
    if (renderer) {
      renderer.flash(0xc9f5c7);
    }
  }

  onUnitDied(data) {
    const renderer = this.unitRenderers.get(data.unit.id);
    if (renderer) {
      renderer.playDeathAnimation();
    }
  }

  onUnitStatusApplied(data) {
    const renderer = this.unitRenderers.get(data.unit.id);
    if (!renderer) return;

    const colorMap = {
      stun: 0xb5c7ff,
      slow: 0x9fd6ff,
      pushback: 0xffe6a8,
      buff: 0xf1d08f
    };

    const color = colorMap[data.status.type];
    if (color) {
      renderer.flash(color);
    }
  }

  // --- Castle Rendering ---

  createCastleRenderer(castle) {
    const renderer = new CastleRenderer(this.scene, castle, this.ctx);
    this.castleRenderers.set(castle.id, renderer);
    return renderer;
  }

  destroyCastleRenderer(castleId) {
    const renderer = this.castleRenderers.get(castleId);
    if (renderer) {
      renderer.destroy();
      this.castleRenderers.delete(castleId);
    }
  }

  onCastleDamaged(data) {
    const renderer = this.castleRenderers.get(data.castle.id);
    if (renderer) {
      renderer.flashDamage();
      renderer.shake();
    }
  }

  // --- Turret Rendering ---

  createTurretRenderer(turret) {
    const renderer = new TurretRenderer(this.scene, turret, this.ctx);
    this.turretRenderers.set(turret.id, renderer);
    return renderer;
  }

  destroyTurretRenderer(turretId) {
    const renderer = this.turretRenderers.get(turretId);
    if (renderer) {
      renderer.destroy();
      this.turretRenderers.delete(turretId);
    }
  }

  onTurretFired(data) {
    const renderer = this.turretRenderers.get(data.turret.id);
    if (renderer) {
      renderer.fireArrow(data.targetX, data.targetY);
      renderer.flash(0xffe6a8);
    }
  }

  // --- Update Loop ---

  /**
   * Update all renderers to sync with current entity state.
   * Called each frame from GameScene.
   */
  update() {
    // Sync unit renderers
    for (const [unitId, renderer] of this.unitRenderers) {
      const unit = this.ctx.state.getUnit(unitId);
      if (unit) {
        renderer.sync(unit);
      }
    }

    // Sync castle renderers
    for (const [castleId, renderer] of this.castleRenderers) {
      const side = renderer.side;
      const castle = this.ctx.state.getCastle(side);
      if (castle && castle.id === castleId) {
        renderer.sync(castle);
      }
    }

    // Sync turret renderers
    for (const [turretId, renderer] of this.turretRenderers) {
      const side = renderer.side;
      const turrets = this.ctx.state.getTurrets(side);
      const turret = turrets.find((t) => t.id === turretId);
      if (turret) {
        renderer.sync(turret);
      }
    }
  }

  // --- Cleanup ---

  destroy() {
    // Unsubscribe from all events
    for (const unsub of this.subscriptions) {
      if (typeof unsub === "function") unsub();
    }
    this.subscriptions = [];

    // Destroy all renderers
    for (const renderer of this.unitRenderers.values()) {
      renderer.destroy();
    }
    this.unitRenderers.clear();

    for (const renderer of this.castleRenderers.values()) {
      renderer.destroy();
    }
    this.castleRenderers.clear();

    for (const renderer of this.turretRenderers.values()) {
      renderer.destroy();
    }
    this.turretRenderers.clear();

    this.effectsRenderer.destroy();
  }
}
