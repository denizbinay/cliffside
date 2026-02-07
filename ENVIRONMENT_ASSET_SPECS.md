# Environment Asset Execution Pack

This pack matches the current Phaser rendering pipeline and preload keys.

## Board Geometry (from code)

- Resolution: `1280x720`
- Play area: `x=0, y=84, w=1280, h=436`
- Lane baseline: `bridgeY = 354.32`
- Left platform span: `x=60..200`
- Right platform span: `x=1080..1220`
- Bridge span: `x=200..1080` (width `880`)
- Control points:
  - `(346.67, 354.32)`
  - `(493.33, 354.32)`
  - `(640.00, 354.32)`
  - `(786.67, 354.32)`
  - `(933.33, 354.32)`
- Castles:
  - Player: `(42, 324.32)`
  - AI: `(1238, 324.32)`
- Turrets:
  - Player: `(182, 348.32)`
  - AI: `(1098, 348.32)`

## Required Files and Sizes

All assets must be transparent PNG.

### `assets/environment/`

- `bg_sky_mountains.png` -> `bg_sky` (`1536x720`)
- `bg_mid_hills.png` -> `bg_mid` (`1536x720`)
- `bg_foreground_cliffs.png` -> `bg_front` (`1536x720`)
- `platform_stone.png` -> `platform_stone` (`280x128`)
- `bridge_plank_segment.png` -> `bridge_plank` (`180x84`)
- `bridge_rope_texture.png` -> `bridge_rope` (`512x64`)
- `bridge_pillar.png` -> `bridge_pillar` (`96x160`)

### `assets/structures/`

- `castle_player_base.png` -> `castle_base_player` (`320x420`)
- `castle_ai_base.png` -> `castle_base_ai` (`320x420`)
- `castle_tower_addon.png` -> `castle_tower` (`240x260`)
- `flag_animated_sheet.png` -> `flag_anim` spritesheet (`512x64` total, 8 frames, each `64x64`)
- `turret_base_stone.png` -> `turret_base` (`160x128`)
- `turret_head_bow.png` -> `turret_head` (`128x128`)

### `assets/ui/`

- `control_point_rune.png` -> `control_rune` (`96x96`)
- `control_point_glow.png` -> `control_glow` (`128x128`)

## ImageGen Prompt Base

Use this preamble in every prompt:

```text
STYLE LOCK (must follow):
- hand-painted 2D fantasy environment
- calm atmospheric mood, soft lighting
- clear silhouette, readable from gameplay distance
- side-view orthographic feel
- painterly, low noise, not pixel art, not photoreal

TECHNICAL LOCK (must follow):
- transparent background with true alpha
- PNG output
- single centered subject only
- no text, no watermark, no frame, no shadow backdrop
- consistent global light direction: upper-left
- preserve clean outer contour for layering over units/VFX
```

Static asset prompt:

```text
[STYLE LOCK + TECHNICAL LOCK]

Create: {asset_name}
Composition: {silhouette priorities}
Color direction: desaturated cool neutrals + warm accents
Output size: {W}x{H}
```

Animated spritesheet prompt:

```text
[STYLE LOCK + TECHNICAL LOCK]

Create: {asset_name} subtle idle loop spritesheet.
Animation: gentle and non-distracting.
Sheet format: horizontal strip, {N} frames.
Each frame: {FW}x{FH}
Total sheet size: {TW}x{TH}
Anchor lock: baseline/pivot identical in every frame.
No camera movement, no framing shift, no scale drift.
```

## Prompt Lines Per Asset

- `bg_sky`: distant mountains + haze, low contrast, `1536x720`
- `bg_mid`: rolling hills, medium contrast, `1536x720`
- `bg_front`: foreground cliff framing, readable center lane, `1536x720`
- `platform_stone`: top surface readability, seam-safe sides, `280x128`
- `bridge_plank`: tileable segment, straight top edge, `180x84`
- `bridge_rope`: rope strip texture, no perspective warp, `512x64`
- `bridge_pillar`: vertical support post silhouette, `96x160`
- `castle_base_player`: keep base with gate read, `320x420`
- `castle_base_ai`: same mass/proportion as player castle, `320x420`
- `castle_tower`: add-on tower mass, `240x260`
- `turret_base`: compact defensive pedestal, `160x128`
- `turret_head`: bow turret head cap, `128x128`
- `control_rune`: circular marker glyph, `96x96`
- `control_glow`: radial soft aura, `128x128`
- `flag_anim`: subtle waving cloth, 8 frames, each `64x64`, total `512x64`

## Validation Checklist

- Transparent alpha only (no matte fringe)
- Bridge and platform seams align cleanly
- Castle/turret silhouette readable behind units
- Control points readable under unit stacks
- Flag loop is seamless from frame 8 to 1
- Detail level stays low enough for gameplay clarity
