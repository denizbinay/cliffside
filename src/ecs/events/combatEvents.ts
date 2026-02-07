import type { GameWorld } from "../world";

export type CombatEventName = "beforeAttack" | "afterDamage" | "onHit" | "onKill";

export interface CombatEventContext {
  world: GameWorld;
  attackerEid: number;
  targetEid: number;
  baseDamage: number;
  damage: number;
  isCritical: boolean;
  didKill: boolean;
}

export type CombatEventHandler = (context: CombatEventContext) => void;
