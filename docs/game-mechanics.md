# Game Mechanics

## Units

### Roles
- **Frontline** - Melee tanks that hold the line, high presence for zone control
- **Damage** - Ranged attackers that deal damage from distance
- **Support** - Healers that restore ally health (no damage)
- **Disruptor** - Utility units with crowd control (slow, stun, knockback)

### Tiers
- **Tier 1** - Available from start (Stage 0)
- **Tier 2** - Available from Stage 1 (after 1:30)
- **Tier 3** - Available from Stage 2 (after 3:30)

### Unit Definitions
All unit stats are defined in `src/data/units/`. Each file exports a `UnitTypeConfig` with:
- `hp`, `damage`, `range`, `speed`, `attackRate`
- `cost`, `presence`, `shopWeight`
- `role`, `tier`, `stageMin`
- `tags` (for special behaviors like `slow`, `stun`, `push`)

**Canonical example:** `src/data/units/guard.ts`

---

## Combat

### Flow
1. **Targeting** - Units find closest enemy in range (`TargetingSystem`)
2. **Attack** - Combat cooldown triggers attack (`CombatSystem`)
3. **Damage** - Routed through `DamagePipeline` with hooks
4. **Status** - Effects applied (slow, stun, knockback)
5. **Death** - HP <= 0 triggers death sequence

### Status Effects
| Effect | Description |
|--------|-------------|
| Stun | Cannot move or attack |
| Slow | Reduced movement speed (power = multiplier) |
| Buff | Increased damage output |
| Knockback | Forced movement away from source |

Units with status effects have `tags` in their config (e.g., `["slow"]` on Archer).

---

## Castle Abilities

Defined in `src/data/abilities.ts`:
- **Heal Wave** - Heals all friendly units
- **Defensive Pulse** - Pushes and stuns enemies near castle

---

## Economy

**File:** `src/systems/EconomySystem.ts`

### Income Formula (Example)
```
income = base + (ownedPoints * pointBonus) + (enemyPoints * enemyPointBonus) + interest
```

Components:
- **base** - Passive income per tick
- **pointBonus** - Bonus per owned control point
- **enemyPointBonus** - Extra bonus for capturing enemy-side points
- **interest** - Percentage on banked resources (capped)

Kill bounty awards gold per enemy killed.

**For current values, see `ECONOMY_CONFIG` in `src/config/GameConfig.ts`.**

---

## Shop

**File:** `src/systems/ShopManager.ts`

### How It Works
- 4 offers per wave
- Weighted random selection (higher `shopWeight` = more common)
- Tier restricted by current stage
- Early game guarantees frontline + support

### Reroll Cost
Increases with each reroll during a wave, resets when wave sends.

**For current formula and values, see `SHOP_CONFIG` in `src/data/shop.ts`.**

---

## Waves

**File:** `src/systems/WaveManager.ts`

### Wave Schedule (Example)
Waves become more frequent as stages progress:

| Stage | Timing |
|-------|--------|
| Early | Longer intervals |
| Mid | Medium intervals |
| Late | Shorter intervals |

**For current timings, see `WAVE_CONFIG` in `src/config/GameConfig.ts`.**

### Draft Grid
3 rows (front, mid, rear) x 4 columns. Front row spawns first.

### Role Diminishing Returns
When too many units of the same role are drafted, their `presence` is reduced with each additional unit (with a floor). This encourages role diversity.

**For current thresholds and multipliers, see `WAVE_CONFIG` in `src/config/GameConfig.ts`.**

### Configuration
See `WAVE_CONFIG` in `src/config/GameConfig.ts`.

---

## Battle Stances

**File:** `src/data/stances.ts`

Stances modify all units in a wave:

| Stance | Trade-off |
|--------|-----------|
| Normal | No modifiers |
| Defensive | +15% HP, -10% damage, -10% speed |
| Aggressive | -10% HP, +10% damage, +10% speed |

Exact multipliers are in the stances file.

---

## Control Points

- Located on bridge between castles
- Holding grants increased resource income
- Presence determined by nearby units and their `Presence` component
- Frontline units typically have higher presence values
