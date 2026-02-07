import type { UnitAnimationAsset, UnitAnimationProfile } from "../types";

import { adeptAnimAsset, adeptAnimProfile } from "./units/adept";
import { arbalistAnimAsset, arbalistAnimProfile } from "./units/arbalist";

export const UNIT_ANIMATION_ASSETS: Record<string, UnitAnimationAsset> = {
  adept: adeptAnimAsset,
  arbalist: arbalistAnimAsset
};

export const UNIT_ANIMATION_PROFILES: Record<string, UnitAnimationProfile> = {
  adept: adeptAnimProfile,
  arbalist: arbalistAnimProfile
};
