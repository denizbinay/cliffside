import { defineComponent, Types } from "bitecs";

export const Render = defineComponent({
  storeIndex: Types.ui32,
  visible: Types.ui8,
  depth: Types.ui8
});
