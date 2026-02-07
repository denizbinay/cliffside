import { defineComponent, Types } from "bitecs";

export const Faction = defineComponent({
  value: Types.ui8
});

export const FACTION = {
  NEUTRAL: 0,
  PLAYER: 1,
  AI: 2
} as const;
