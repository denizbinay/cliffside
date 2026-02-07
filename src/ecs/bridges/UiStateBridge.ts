import { countAliveUnits } from "../queries/aliveUnits";
import { getControlPointOwners } from "../queries/controlPointQueries";
import { getPresenceTotals } from "../queries/statQueries";
import { FACTION } from "../components";
import type { UiState } from "../../types";
import type { GameWorld } from "../world";

export class UiStateBridge {
  private world: GameWorld;

  constructor(world: GameWorld) {
    this.world = world;
  }

  buildState(legacyState: Partial<UiState>): UiState {
    const playerAliveUnits = countAliveUnits(this.world, FACTION.PLAYER);
    const aiAliveUnits = countAliveUnits(this.world, FACTION.AI);
    const presenceTotals = getPresenceTotals(this.world);
    const controlPoints =
      legacyState.controlPoints && legacyState.controlPoints.length > 0
        ? legacyState.controlPoints
        : getControlPointOwners(this.world);

    return {
      ...legacyState,
      controlPoints,
      playerAliveUnits,
      aiAliveUnits,
      playerPresence: presenceTotals.player,
      aiPresence: presenceTotals.ai
    } as UiState;
  }
}
