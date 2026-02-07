import { defineComponent, Types } from "bitecs";

export const Combat = defineComponent({
  damage: Types.f32,
  range: Types.f32,
  attackRate: Types.f32,
  cooldown: Types.f32,
  healAmount: Types.f32
});
