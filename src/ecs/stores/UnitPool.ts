import { addEntity, removeComponent } from "bitecs";
import { UNIT_COMPONENTS } from "../archetypes/unitArchetype";
import type { GameWorld } from "../world";

export class UnitPool {
  private pool: number[] = [];

  acquire(world: GameWorld): number {
    const reused = this.pool.pop();
    if (reused !== undefined) return reused;
    return addEntity(world);
  }

  release(world: GameWorld, eid: number): void {
    for (const component of UNIT_COMPONENTS) {
      removeComponent(world, component, eid);
    }
    this.pool.push(eid);
  }

  clear(): void {
    this.pool = [];
  }

  get size(): number {
    return this.pool.length;
  }
}
