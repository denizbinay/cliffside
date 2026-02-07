import type { UnitTypeConfig, UnitTypesMap } from "../../types";

export class ConfigStore {
  private unitConfigs: UnitTypeConfig[];
  private unitIndexById: Map<string, number>;

  constructor(unitTypes: UnitTypesMap) {
    this.unitConfigs = Object.values(unitTypes);
    this.unitIndexById = new Map();

    this.unitConfigs.forEach((config, index) => {
      this.unitIndexById.set(config.id, index);
    });
  }

  getUnitConfigs(): readonly UnitTypeConfig[] {
    return this.unitConfigs;
  }

  getUnitIndex(id: string): number | undefined {
    return this.unitIndexById.get(id);
  }

  getUnitConfigById(id: string): UnitTypeConfig | undefined {
    const index = this.unitIndexById.get(id);
    if (index === undefined) return undefined;
    return this.unitConfigs[index];
  }

  getUnitConfigByIndex(index: number): UnitTypeConfig | undefined {
    return this.unitConfigs[index];
  }
}
