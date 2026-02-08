# Gotchas

Common pitfalls and lessons learned from development.

---

## Sprite Sheet Animations & Bounding Box Data

### The Problem

The `collision-bounding-boxes.json` files contain **collision detection data**, NOT sprite extraction coordinates.

Each entry has fields like:
```json
{
  "x": 307,
  "y": 155,
  "width": 156,
  "height": 221,
  "frameIndex": 0,
  "row": 0,
  "col": 0,
  "originalX": 307,
  "originalY": 155
}
```

The `x`, `y`, `width`, `height` values describe a small collision rectangle (~150x220px) within each frame cell - this is where the character's hitbox is, NOT the sprite boundaries.

### The Mistake

Using these collision coordinates as sprite extraction regions results in:
- Tiny cropped sprites (just the collision area)
- Broken animations
- Characters appearing as small fragments

### The Solution

Our sprite sheets have a consistent structure:
- **Grid**: 4 columns x 7 rows = 28 frames
- **Frame size**: 768px width x 448px height
- **Total sheet**: 3072px x 3136px
- **Alpha transparency**: Yes (no chroma keying needed)

To extract frames correctly:
1. Use the `row` and `col` values to locate each frame in the grid
2. Calculate source coordinates as `col * 768` and `row * frameHeight`
3. Extract the **full 768x448 cell** - alpha handles transparency
4. Ignore the collision box coordinates for sprite rendering

### When to Use Collision Data

The `x`, `y`, `width`, `height` values are useful for:
- Hitbox detection during combat
- Collision detection between units
- Click/tap detection on units

They are NOT for sprite sheet slicing.
