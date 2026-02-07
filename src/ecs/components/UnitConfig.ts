import { defineComponent, Types } from "bitecs";

export const UnitConfig = defineComponent({
  typeIndex: Types.ui16,
  size: Types.f32,
  color: Types.ui32
});
