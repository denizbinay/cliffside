import type { UiState } from "../../types";
import type { GameWorld } from "../world";
import { UiStateBridge } from "../bridges/UiStateBridge";

export interface UiStateSystemOptions {
  buildLegacyState: () => Partial<UiState>;
  emit: (state: UiState) => void;
}

export function createUiStateSystem(options: UiStateSystemOptions): (world: GameWorld) => GameWorld {
  const { buildLegacyState, emit } = options;

  return function uiStateSystem(world: GameWorld): GameWorld {
    const legacyState = buildLegacyState();
    const bridge = new UiStateBridge(world);
    const uiState = bridge.buildState(legacyState);
    emit(uiState);
    return world;
  };
}
