# ECS Phase 4 Complete

## RenderStore Structure

`RenderStoreEntry` holds Phaser objects created outside the ECS component arrays.

```typescript
interface RenderStoreEntry {
  container: Phaser.GameObjects.Container;
  mainShape: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite;
  mainSprite?: Phaser.GameObjects.Sprite | null;
  healthBar: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
  healthBarOffsetY?: number;
  statusDots: StatusDotsContainer;
}
```

## Visual Entity Creation

`createUnitVisuals` builds Phaser visuals and registers them in the `RenderStore`.

```typescript
createUnitVisuals(scene, eid, config, side, renderStore)
```

Steps:
- Resolve animation profile, create sprite or fallback shape
- Build status dots container and attach to unit container
- Create health bar/health fill rectangles
- Store all objects in `RenderStore` and write `Render.storeIndex`

## Render System Order

Render systems run after gameplay systems at `SYSTEM_PRIORITY.RENDER`:

1. `SpriteSystem`
2. `HealthBarSystem`
3. `StatusDotSystem`
4. `AnimationSystem`
5. `SpawnEffectSystem`
6. `FlashEffectSystem`

## Data Flow

```text
ECS Components (read-only) -> Render Systems -> RenderStore -> Phaser Objects
```

Render systems only read ECS component data and update Phaser visuals. They never modify ECS components.
