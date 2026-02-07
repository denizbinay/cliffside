/**
 * ActiveEffects store for managing timed effects per entity.
 *
 * This is a map-based store (not a bitecs component) because active effects
 * are variable-length arrays per entity.
 */

import type { ActiveEffect } from "../../sim/EffectSystem";

class ActiveEffectsStore {
  private effects = new Map<number, ActiveEffect[]>();

  get(eid: number): ActiveEffect[] {
    return this.effects.get(eid) ?? [];
  }

  add(eid: number, effect: ActiveEffect): void {
    const list = this.effects.get(eid) ?? [];
    list.push(effect);
    this.effects.set(eid, list);
  }

  remove(eid: number, instanceId: number): boolean {
    const list = this.effects.get(eid);
    if (!list) return false;
    const idx = list.findIndex((e) => e.instanceId === instanceId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  removeAll(eid: number): void {
    this.effects.delete(eid);
  }

  findByKind(eid: number, kind: string): ActiveEffect | undefined {
    return this.get(eid).find((e) => e.def.kind === kind);
  }

  findById(eid: number, id: string): ActiveEffect | undefined {
    return this.get(eid).find((e) => e.def.id === id);
  }

  hasKind(eid: number, kind: string): boolean {
    return this.findByKind(eid, kind) !== undefined;
  }

  hasId(eid: number, id: string): boolean {
    return this.findById(eid, id) !== undefined;
  }

  getStacks(eid: number, id: string): number {
    const effect = this.findById(eid, id);
    return effect?.stacks ?? 0;
  }

  clear(): void {
    this.effects.clear();
  }

  /** Iterate all entities with effects. */
  entities(): IterableIterator<number> {
    return this.effects.keys();
  }

  /** Get total effect count across all entities. */
  get size(): number {
    let count = 0;
    for (const list of this.effects.values()) {
      count += list.length;
    }
    return count;
  }
}

export const activeEffectsStore = new ActiveEffectsStore();
