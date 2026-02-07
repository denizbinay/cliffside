import { defineComponent, Types } from "bitecs";

export const Velocity = defineComponent({
  vx: Types.f32,
  vy: Types.f32,
  baseSpeed: Types.f32
});
