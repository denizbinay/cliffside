import type { GameWorld } from "../world";
import type { System, SystemDef } from "../types";

export class SystemScheduler {
  private systems: SystemDef[] = [];
  private sorted = false;

  register(name: string, system: System, priority: number = 50): void {
    this.systems.push({ name, system, priority, enabled: true });
    this.sorted = false;
  }

  enable(name: string): void {
    const sys = this.systems.find((entry) => entry.name === name);
    if (sys) sys.enabled = true;
  }

  disable(name: string): void {
    const sys = this.systems.find((entry) => entry.name === name);
    if (sys) sys.enabled = false;
  }

  run(world: GameWorld): GameWorld {
    if (!this.sorted) {
      this.systems.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }

    for (const { system, enabled, name } of this.systems) {
      if (!enabled) continue;

      try {
        world = system(world);
      } catch (err) {
        console.error(`System "${name}" error:`, err);
      }
    }

    return world;
  }

  getSystemNames(): string[] {
    return this.systems.map((entry) => entry.name);
  }
}
