import { createGameWorld, resetGameWorld, updateWorldTime } from "../world";
import { registerStandardEffectHandlers } from "../../sim/EffectHandlers";
import { initializePipelineHooks } from "../../sim/PipelineHooks";
import {
  createCombatSystem,
  createCleanupSystem,
  createControlPointSystem,
  createCooldownSystem,
  createFlashEffectSystem,
  createHealerSystem,
  createHealthSystem,
  createAnimationSystem,
  createHealthBarSystem,
  createMovementSystem,
  createSpawnEffectSystem,
  createSpriteSystem,
  createStatusDotSystem,
  createStatusSystem,
  createTargetingSystem,
  createActiveEffectsSystem,
  createStatModifierSystem,
  createResourceSystem,
  createShieldSystem,
  createActionSystem,
  createDisplacementSystem,
  createVisibilitySystem,
  SystemScheduler
} from "../systems";
import { RenderStore } from "../stores/RenderStore";
import { ConfigStore } from "../stores/ConfigStore";
import { EntityType, Render, UnitConfig, FACTION } from "../components";
import { ENTITY_TYPE } from "../constants";
import { UnitPool } from "../stores/UnitPool";
import { EventBridge } from "./EventBridge";
import { UiStateBridge } from "./UiStateBridge";
import { UNIT_ANIMATION_PROFILES } from "../../data/unitAnimationProfiles";
import { SYSTEM_PRIORITY } from "../constants";
import { UNIT_TYPES } from "../../data/units";
import type { GameWorld } from "../world";
import type GameScene from "../../scenes/GameScene";

interface GameSceneBridgeOptions {
  seed?: number;
  stepMs?: number;
}

export class GameSceneBridge {
  world: GameWorld;
  scheduler: SystemScheduler;
  renderStore: RenderStore;
  configStore: ConfigStore;
  unitPool: UnitPool;
  uiStateBridge: UiStateBridge;
  eventBridge: EventBridge;

  private scene: GameScene;

  constructor(scene: GameScene, options: GameSceneBridgeOptions = {}) {
    this.scene = scene;
    this.world = createGameWorld(options);
    this.world.scene = scene;

    // Initialize simulation hooks and handlers
    initializePipelineHooks(this.world.sim.pipeline);
    registerStandardEffectHandlers();

    this.scheduler = new SystemScheduler();
    this.renderStore = new RenderStore();
    this.configStore = new ConfigStore(UNIT_TYPES);
    this.unitPool = new UnitPool();
    this.uiStateBridge = new UiStateBridge(this.world);
    this.eventBridge = new EventBridge(this.scene, this.world);
    this.eventBridge.setup();
    this.registerSystems();
  }

  update(delta: number, now: number): void {
    updateWorldTime(this.world, delta, now);
    this.scheduler.run(this.world);
  }

  destroy(): void {
    this.eventBridge.destroy();
    this.renderStore.clear();
    this.unitPool.clear();
    resetGameWorld(this.world);
  }

  private registerSystems(): void {
    const getCastleX = (faction: number): number | null => {
      const eid = this.scene.getCastleEidByFaction(faction);
      if (!eid) return null;
      return this.scene.getEntityX(eid);
    };
    const resolveAnimKey = (eid: number, action: string): string | null => {
      const unitConfig = this.configStore.getUnitConfigByIndex(UnitConfig.typeIndex[eid]);
      if (!unitConfig) return null;

      const profile = UNIT_ANIMATION_PROFILES[unitConfig.id];
      if (!profile?.actions) return null;

      const fallback = profile.fallback || {};
      const candidates = [action, ...(fallback[action] || []), "idle"];
      const visited = new Set<string>();

      for (const candidate of candidates) {
        if (!candidate || visited.has(candidate)) continue;
        visited.add(candidate);
        const animDef = profile.actions[candidate];
        if (!animDef?.key) continue;
        if (this.scene.anims.exists(animDef.key)) {
          return animDef.key;
        }
      }

      return null;
    };
    const onCleanup = (eid: number): boolean | void => {
      const storeIndex = Render.storeIndex[eid];
      if (storeIndex) {
        this.renderStore.delete(storeIndex);
      }
      this.scene.handleEntityCleanup(eid);
      if (EntityType.value[eid] & ENTITY_TYPE.UNIT) {
        this.unitPool.release(this.world, eid);
        return false;
      }
    };

    this.scheduler.register("active-effects", createActiveEffectsSystem(), 5);
    this.scheduler.register("stat-modifiers", createStatModifierSystem(), 6);
    this.scheduler.register("resources", createResourceSystem(), 7);
    this.scheduler.register("visibility", createVisibilitySystem(), 8);

    this.scheduler.register("status", createStatusSystem(), SYSTEM_PRIORITY.STATUS);
    this.scheduler.register("cooldown", createCooldownSystem(), SYSTEM_PRIORITY.MOVEMENT - 5);
    this.scheduler.register("targeting", createTargetingSystem(), SYSTEM_PRIORITY.AI);

    this.scheduler.register("actions", createActionSystem(), 12);

    this.scheduler.register(
      "control-points",
      createControlPointSystem({
        getControlPoints: () => this.scene.controlPoints || [],
        getControlPointEids: () => this.scene.controlPointEids || [],
        onPointOwnerChanged: (point, previousOwner) => this.scene.onControlPointOwnerChanged?.(point, previousOwner),
        onZoneOwnerChanged: (owner, previousOwner) => this.scene.onZoneOwnerChanged?.(owner, previousOwner)
      }),
      SYSTEM_PRIORITY.HEALTH + 1
    );

    this.scheduler.register("displacement", createDisplacementSystem(), SYSTEM_PRIORITY.MOVEMENT - 1);
    this.scheduler.register("movement", createMovementSystem(getCastleX), SYSTEM_PRIORITY.MOVEMENT);

    this.scheduler.register("combat", createCombatSystem(this.world, this.configStore), SYSTEM_PRIORITY.COMBAT);
    this.scheduler.register("healer", createHealerSystem(getCastleX), SYSTEM_PRIORITY.COMBAT + 5);

    this.scheduler.register("shields", createShieldSystem(), SYSTEM_PRIORITY.HEALTH - 1);
    this.scheduler.register("health", createHealthSystem(), SYSTEM_PRIORITY.HEALTH);
    this.scheduler.register("cleanup", createCleanupSystem(onCleanup), SYSTEM_PRIORITY.CLEANUP);
    this.scheduler.register("sprite", createSpriteSystem(this.renderStore), SYSTEM_PRIORITY.RENDER);
    this.scheduler.register("health-bars", createHealthBarSystem(this.renderStore), SYSTEM_PRIORITY.RENDER + 1);
    this.scheduler.register("status-dots", createStatusDotSystem(this.renderStore), SYSTEM_PRIORITY.RENDER + 2);
    this.scheduler.register(
      "animation",
      createAnimationSystem(this.renderStore, resolveAnimKey),
      SYSTEM_PRIORITY.RENDER + 3
    );
    this.scheduler.register("spawn-effects", createSpawnEffectSystem(this.renderStore), SYSTEM_PRIORITY.RENDER + 4);
    this.scheduler.register("flash-effects", createFlashEffectSystem(this.renderStore), SYSTEM_PRIORITY.RENDER + 5);
  }
}
