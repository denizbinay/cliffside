import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("pixel", 2, 2);
    g.destroy();

    this.scene.start("Game");
    this.scene.start("UI");
  }
}
