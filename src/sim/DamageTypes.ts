/**
 * Damage type enumeration for the combat transaction pipeline.
 * Physical/Magic/True form the core triangle; Pure bypasses everything.
 */
export const DAMAGE_TYPE = {
  PHYSICAL: 0,
  MAGIC: 1,
  TRUE: 2,
  PURE: 3
} as const;

export type DamageType = (typeof DAMAGE_TYPE)[keyof typeof DAMAGE_TYPE];

/** Human-readable labels keyed by numeric type. */
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  [DAMAGE_TYPE.PHYSICAL]: "physical",
  [DAMAGE_TYPE.MAGIC]: "magic",
  [DAMAGE_TYPE.TRUE]: "true",
  [DAMAGE_TYPE.PURE]: "pure"
};
