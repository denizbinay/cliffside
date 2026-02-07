export const MAX_ENTITIES = 1000;

export const COMPONENT_IDS = {
  POSITION: 0,
  VELOCITY: 1,
  HEALTH: 2,
  COMBAT: 3
} as const;

export const SYSTEM_PRIORITY = {
  INPUT: 0,
  AI: 10,
  MOVEMENT: 20,
  COMBAT: 30,
  STATUS: 40,
  HEALTH: 50,
  CLEANUP: 60,
  RENDER: 100
} as const;

export const ENTITY_TYPE = {
  UNIT: 1 << 0,
  CASTLE: 1 << 1,
  TURRET: 1 << 2,
  PROJECTILE: 1 << 3,
  CONTROL_POINT: 1 << 4
} as const;
