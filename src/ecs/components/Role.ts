import { defineComponent, Types } from "bitecs";

export const Role = defineComponent({
  value: Types.ui8
});

export const ROLE = {
  NONE: 0,
  FRONTLINE: 1,
  DAMAGE: 2,
  SUPPORT: 3,
  DISRUPTOR: 4
} as const;
