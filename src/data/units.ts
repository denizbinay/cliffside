import type { UnitTypesMap } from "../types";
import { guardConfig } from "./units/guard";
import { sentinelConfig } from "./units/sentinel";
import { bulwarkConfig } from "./units/bulwark";
import { bastionConfig } from "./units/bastion";
import { pikemanConfig } from "./units/pikeman";
import { vanguardConfig } from "./units/vanguard";
import { archerConfig } from "./units/archer";
import { skirmisherConfig } from "./units/skirmisher";
import { slingerConfig } from "./units/slinger";
import { rangerConfig } from "./units/ranger";
import { arbalistConfig } from "./units/arbalist";
import { ballistaConfig } from "./units/ballista";
import { clericConfig } from "./units/cleric";
import { minstrelConfig } from "./units/minstrel";
import { adeptConfig } from "./units/adept";
import { warderConfig } from "./units/warder";
import { sageConfig } from "./units/sage";
import { oracleConfig } from "./units/oracle";
import { saboteurConfig } from "./units/saboteur";
import { hammererConfig } from "./units/hammerer";
import { lancerConfig } from "./units/lancer";

export const UNIT_TYPES: UnitTypesMap = {
  guard: guardConfig,
  sentinel: sentinelConfig,
  bulwark: bulwarkConfig,
  bastion: bastionConfig,
  pikeman: pikemanConfig,
  vanguard: vanguardConfig,
  archer: archerConfig,
  skirmisher: skirmisherConfig,
  slinger: slingerConfig,
  ranger: rangerConfig,
  arbalist: arbalistConfig,
  ballista: ballistaConfig,
  cleric: clericConfig,
  minstrel: minstrelConfig,
  adept: adeptConfig,
  warder: warderConfig,
  sage: sageConfig,
  oracle: oracleConfig,
  saboteur: saboteurConfig,
  hammerer: hammererConfig,
  lancer: lancerConfig
};
