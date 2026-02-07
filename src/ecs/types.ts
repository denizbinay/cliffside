import type { GameWorld } from "./world";

export type EntityId = number;

export type System = (world: GameWorld) => GameWorld;

export interface SystemDef {
  name: string;
  priority: number;
  system: System;
  enabled: boolean;
}

export interface ComponentSchemas {
  Position: { x: number; y: number };
  Velocity: { vx: number; vy: number };
  Health: { current: number; max: number };
  Combat: { damage: number; range: number; attackRate: number; cooldown: number };
}
