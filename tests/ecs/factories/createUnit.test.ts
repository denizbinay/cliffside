import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import {
  Animation,
  Combat,
  Death,
  Faction,
  Health,
  Position,
  Presence,
  Render,
  Role,
  StatusEffects,
  Target,
  UnitConfig,
  Velocity,
  ANIM_ACTION,
  FACTION,
  ROLE
} from "../../../src/ecs/components";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { UNIT_TYPES } from "../../../src/data/units";
import { UNIT_SIZE } from "../../../src/config/GameConfig";

describe("createUnit", () => {
  it("creates a unit with initialized components", () => {
    const world = createGameWorld();
    const config = UNIT_TYPES.guard;
    const configStore = new ConfigStore(UNIT_TYPES);

    const eid = createUnit(world, {
      config,
      side: "player",
      x: 120,
      y: 340,
      modifiers: {
        hpMult: 1.2,
        dmgMult: 1.5,
        rangeMult: 1.1,
        speedMult: 0.9,
        attackRateMult: 1.3,
        healMult: 1.4
      },
      presenceMult: 1.6,
      configStore
    });

    expect(Position.x[eid]).toBe(120);
    expect(Position.y[eid]).toBe(340);

    expect(Velocity.baseSpeed[eid]).toBeCloseTo(config.speed * 0.9);
    expect(Velocity.vx[eid]).toBe(0);
    expect(Velocity.vy[eid]).toBe(0);

    expect(Health.max[eid]).toBeCloseTo(config.hp * 1.2);
    expect(Health.current[eid]).toBeCloseTo(config.hp * 1.2);

    expect(Combat.damage[eid]).toBeCloseTo(config.dmg * 1.5);
    expect(Combat.range[eid]).toBeCloseTo(config.range * 1.1);
    expect(Combat.attackRate[eid]).toBeCloseTo(config.attackRate * 1.3);
    expect(Combat.cooldown[eid]).toBe(0);
    expect(Combat.healAmount[eid]).toBeCloseTo((config.healAmount || 0) * 1.4);

    expect(StatusEffects.stunTimer[eid]).toBe(0);
    expect(StatusEffects.slowTimer[eid]).toBe(0);
    expect(StatusEffects.slowPower[eid]).toBe(1);
    expect(StatusEffects.buffTimer[eid]).toBe(0);
    expect(StatusEffects.buffPower[eid]).toBe(1);

    expect(Faction.value[eid]).toBe(FACTION.PLAYER);
    expect(Role.value[eid]).toBe(ROLE.FRONTLINE);

    expect(Target.entityId[eid]).toBe(0);
    expect(Target.distance[eid]).toBe(Number.POSITIVE_INFINITY);

    expect(UnitConfig.typeIndex[eid]).toBe(configStore.getUnitIndex(config.id));
    expect(UnitConfig.size[eid]).toBe(UNIT_SIZE[config.role] || UNIT_SIZE.default);
    expect(UnitConfig.color[eid]).toBe(config.color);

    expect(Presence.baseValue[eid]).toBeCloseTo(config.presence);
    expect(Presence.multiplier[eid]).toBeCloseTo(1.6);

    expect(Death.started[eid]).toBe(0);
    expect(Death.animDone[eid]).toBe(0);
    expect(Death.cleanupAt[eid]).toBe(0);

    expect(Animation.currentAction[eid]).toBe(ANIM_ACTION.IDLE);
    expect(Animation.locked[eid]).toBe(0);
    expect(Animation.lockUntil[eid]).toBe(0);

    expect(Render.storeIndex[eid]).toBe(0);
    expect(Render.visible[eid]).toBe(1);
    expect(Render.depth[eid]).toBe(4);
  });
});
