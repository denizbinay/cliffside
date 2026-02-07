import { UNIT_SIZE } from "../config/GameConfig";
import type { UnitTypesMap } from "../types";

export function buildGhostShapes(
  scene: Phaser.Scene,
  typeId: string,
  unitTypes: UnitTypesMap
): Phaser.GameObjects.Shape[] {
  const config = unitTypes[typeId];
  if (!config) return [];
  const role = config.role;
  const size = UNIT_SIZE[role] || UNIT_SIZE.default;
  const color = config.color;
  const shapes: Phaser.GameObjects.Shape[] = [];

  if (typeId === "guard") {
    const body = scene.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
    const shield = scene.add.rectangle(-size * 0.2, 0, size * 0.35, size * 0.6, 0xd6c8a7);
    shapes.push(body, shield);
    return shapes;
  }
  if (typeId === "archer") {
    const body = scene.add.rectangle(0, 0, size * 0.7, size * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
    const bow = scene.add.rectangle(size * 0.35, 0, size * 0.15, size * 0.9, 0xe7d9b8);
    shapes.push(body, bow);
    return shapes;
  }
  if (typeId === "cleric") {
    const body = scene.add.circle(0, 0, size * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
    const halo = scene.add.circle(0, -size * 0.55, size * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
    shapes.push(body, halo);
    return shapes;
  }
  if (typeId === "charger") {
    const body = scene.add.triangle(0, 0, -size * 0.6, size * 0.5, size * 0.6, size * 0.5, 0, -size * 0.6, color);
    body.setStrokeStyle(2, 0x1c1f27, 1);
    const horn = scene.add.rectangle(0, -size * 0.1, size * 0.6, size * 0.12, 0xf0d39a);
    shapes.push(body, horn);
    return shapes;
  }

  const body = scene.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
  shapes.push(body);
  return shapes;
}
