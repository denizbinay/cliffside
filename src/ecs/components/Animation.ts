import { defineComponent, Types } from "bitecs";

export const Animation = defineComponent({
  currentAction: Types.ui8,
  locked: Types.ui8,
  lockUntil: Types.f32
});

export const ANIM_ACTION = {
  IDLE: 0,
  RUN: 1,
  ATTACK: 2,
  HIT: 3,
  DEATH: 4
} as const;
