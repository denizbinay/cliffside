import { defineComponent, Types } from "bitecs";

export const StatusEffects = defineComponent({
  stunTimer: Types.f32,
  slowTimer: Types.f32,
  slowPower: Types.f32,
  buffTimer: Types.f32,
  buffPower: Types.f32
});
