import { defineQuery } from "bitecs";
import { Animation, Render, ANIM_ACTION } from "../../components";
import type { GameWorld } from "../../world";
import type { RenderStore } from "../../stores/RenderStore";

const animatedEntities = defineQuery([Animation, Render]);

const ACTION_TO_ANIM: Record<number, string> = {
  [ANIM_ACTION.IDLE]: "idle",
  [ANIM_ACTION.RUN]: "run",
  [ANIM_ACTION.ATTACK]: "attack",
  [ANIM_ACTION.HIT]: "hit",
  [ANIM_ACTION.DEATH]: "death"
};

export interface AnimationResult {
  key: string;
  isFallback: boolean;
}

export function createAnimationSystem(
  renderStore: RenderStore,
  resolveAnimKey: (eid: number, action: string) => AnimationResult | null,
  playFallbackVfx: (eid: number, action: string) => void
): (world: GameWorld) => GameWorld {
  const lastAction = new Map<number, number>();

  return function animationSystem(world: GameWorld): GameWorld {
    const now = world.time.now;
    const entities = animatedEntities(world);

    for (const eid of entities) {
      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData?.mainSprite?.anims) continue;

      const action = Animation.currentAction[eid];
      const isLocked = Animation.locked[eid] === 1 && now < Animation.lockUntil[eid];

      if (isLocked && action !== ANIM_ACTION.DEATH) continue;

      if (lastAction.get(eid) === action) continue;
      lastAction.set(eid, action);

      const actionName = ACTION_TO_ANIM[action] ?? "idle";
      const result = resolveAnimKey(eid, actionName);

      if (result) {
        renderData.mainSprite.play(result.key, true);

        if (result.isFallback) {
          playFallbackVfx(eid, actionName);
        }
      }
    }

    return world;
  };
}
