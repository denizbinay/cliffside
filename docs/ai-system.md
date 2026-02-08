# AI System

**File:** `src/systems/AIController.ts`

The AIController provides automated decision-making for the AI opponent using heuristic-based behavior.

## Configuration

See `AI_CONFIG` in `src/config/GameConfig.ts` for current values (decision interval, thresholds, etc.).

---

## Decision Loop

The AI makes one decision per interval following this priority:

```
1. Evaluate stance based on game state
2. Check if frontline is needed -> buy frontline
3. Check if support is needed -> buy support
4. Look for disruptor -> buy disruptor
5. Look for damage -> buy damage
6. Buy cheapest affordable unit
7. If nothing affordable -> consider reroll
```

---

## Stance Selection

The AI evaluates castle health and control point ownership:

| Condition | Stance | Rationale |
|-----------|--------|-----------|
| Health disadvantage | Defensive | Survive longer |
| Fewer control points | Aggressive | Push for territory |
| Neither | Normal | Balanced |

Exact thresholds are in `AI_CONFIG`.

---

## Unit Selection Priority

1. **Frontline (if none queued)** - Always maintain tank presence
2. **Support (if none queued)** - Ensure healing capability
3. **Disruptor (any available)** - Add crowd control
4. **Damage (any available)** - Stack damage dealers
5. **Cheapest affordable** - Fallback when specific roles unavailable

---

## Reroll Behavior

The AI considers rerolling when:
- No units can be purchased
- Resources >= rerollCost + safety buffer

This prevents the AI from spending all resources on rerolls.

---

## Key Implementation Details

### Single Action Per Tick
The AI only performs ONE action per `decide()` call. Each successful purchase returns early.

### No Cheating
The AI uses the same shop, economy, and rules as the player.

### Draft Composition Tracking
Before selecting, the AI counts queued roles to determine needs.

---

## Extending AI Behavior

### Adding New Heuristics

Modify the `decide()` method to add conditions:
```typescript
const isLateGame = waveManager.waveNumber >= 8;
if (isLateGame && aiPoints >= playerPoints) {
  stanceId = "aggressive"; // Push for victory
}
```

### Adding Difficulty Levels

Create alternate `AI_CONFIG` objects with different decision intervals and thresholds.

### Adding Strategic Profiles

Implement profile-based branching in `decide()`:
```typescript
type AIProfile = "balanced" | "rusher" | "turtle" | "economy";
```

---

## Hook Points for Extension

| Location | Extension Opportunity |
|----------|----------------------|
| Stance selection | Add timer/wave awareness |
| Role priorities | Add synergy detection |
| Reroll decision | Add "saving for specific unit" logic |
| Unit valuation | Add counter-picking based on player draft |

---

## ECS Integration

The AIController operates outside the ECS layer:
- Does NOT manipulate ECS components directly
- Uses WaveManager to queue units (which spawn ECS entities)
- Reads game state via scene callbacks

```
AIController.decide()
    -> WaveManager.queueUnit()
    -> WaveManager.sendWave()
    -> spawnCallback creates ECS entity
    -> ECS systems process entity
```
