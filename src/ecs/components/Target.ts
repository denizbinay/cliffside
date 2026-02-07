import { defineComponent, Types } from "bitecs";

export const Target = defineComponent({
  entityId: Types.eid,
  distance: Types.f32
});
