import { defineComponent, Types } from "bitecs";

export const Death = defineComponent({
  started: Types.ui8,
  animDone: Types.ui8,
  cleanupAt: Types.f32
});
