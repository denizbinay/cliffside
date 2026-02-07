import { defineQuery } from "bitecs";
import { CONTROL_POINT_CONFIG } from "../../config/GameConfig";
import { EntityType, Faction, FACTION, Health, Position, Presence } from "../components";
import { ENTITY_TYPE } from "../constants";
import { SpatialHash1D } from "../spatial/SpatialHash";
import type { Side, ControlPoint } from "../../types";
import type { GameWorld } from "../world";

const presenceUnits = defineQuery([Position, Presence, Health, Faction, EntityType]);

interface ControlPointSystemOptions {
  getControlPoints: () => ControlPoint[];
  getControlPointEids: () => number[];
  onPointOwnerChanged?: (point: ControlPoint, previousOwner: Side | "neutral") => void;
  onZoneOwnerChanged?: (owner: Side | "neutral", previousOwner: Side | "neutral") => void;
  checkInterval?: number;
}

export function createControlPointSystem(options: ControlPointSystemOptions): (world: GameWorld) => GameWorld {
  const { getControlPoints, getControlPointEids, onPointOwnerChanged, onZoneOwnerChanged } = options;
  const checkInterval = options.checkInterval ?? CONTROL_POINT_CONFIG.checkInterval;
  const spatial = new SpatialHash1D(100);
  let timer = 0;
  let zoneOwner: Side | "neutral" = "neutral";

  return function controlPointSystem(world: GameWorld): GameWorld {
    timer += world.time.delta;
    if (timer < checkInterval) return world;
    timer = 0;

    const points = getControlPoints();
    if (points.length === 0) return world;

    spatial.clear();
    const unitEntities = presenceUnits(world);
    for (const eid of unitEntities) {
      if ((EntityType.value[eid] & ENTITY_TYPE.UNIT) === 0) continue;
      if (Health.current[eid] <= 0) continue;
      spatial.insert(eid, Position.x[eid]);
    }

    let playerCount = 0;
    let aiCount = 0;
    const pointEids = getControlPointEids();

    for (const point of points) {
      let playerPresence = 0;
      let aiPresence = 0;
      const minX = point.zone.x;
      const maxX = point.zone.x + point.zone.width;

      for (const eid of spatial.queryRange(minX, maxX)) {
        if (Position.y[eid] < point.zone.y || Position.y[eid] > point.zone.y + point.zone.height) continue;

        const presence = Presence.baseValue[eid] * Presence.multiplier[eid];
        if (Faction.value[eid] === FACTION.PLAYER) {
          playerPresence += presence;
        } else if (Faction.value[eid] === FACTION.AI) {
          aiPresence += presence;
        }
      }

      const diff = playerPresence - aiPresence;
      if (Math.abs(diff) <= CONTROL_POINT_CONFIG.contestDeadzone) {
        point.progress *= CONTROL_POINT_CONFIG.decayRate;
      } else {
        point.progress = clamp(point.progress + diff * CONTROL_POINT_CONFIG.progressRate, -1, 1);
      }

      const previousOwner = point.owner;
      if (point.progress >= CONTROL_POINT_CONFIG.ownershipThreshold) point.owner = "player";
      else if (point.progress <= -CONTROL_POINT_CONFIG.ownershipThreshold) point.owner = "ai";
      else point.owner = "neutral";

      if (point.owner !== previousOwner) {
        onPointOwnerChanged?.(point, previousOwner);
      }

      if (point.owner === "player") playerCount += 1;
      if (point.owner === "ai") aiCount += 1;

      const pointEid = pointEids[point.index];
      if (pointEid) {
        Faction.value[pointEid] =
          point.owner === "player" ? FACTION.PLAYER : point.owner === "ai" ? FACTION.AI : FACTION.NEUTRAL;
      }
    }

    let newOwner: Side | "neutral" = "neutral";
    if (playerCount > aiCount) newOwner = "player";
    if (aiCount > playerCount) newOwner = "ai";

    if (newOwner !== zoneOwner) {
      const previousOwner = zoneOwner;
      zoneOwner = newOwner;
      onZoneOwnerChanged?.(zoneOwner, previousOwner);
    }

    return world;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
