import type { CombatEventContext, CombatEventHandler, CombatEventName } from "./combatEvents";

type HandlerMap = Record<CombatEventName, CombatEventHandler[]>;

export class CombatEventBus {
  private handlers: HandlerMap = {
    beforeAttack: [],
    afterDamage: [],
    onHit: [],
    onKill: []
  };

  on(event: CombatEventName, handler: CombatEventHandler): void {
    this.handlers[event].push(handler);
  }

  emit(event: CombatEventName, context: CombatEventContext): void {
    for (const handler of this.handlers[event]) {
      handler(context);
    }
  }
}
