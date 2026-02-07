import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import GameScene from "./scenes/GameScene";
import UIController from "./ui/uiController";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#1b1f2a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, GameScene]
};

// Extend the Phaser.Game interface to include our custom property
declare module "phaser" {
  interface Game {
    uiController?: UIController;
  }
}

const game = new Phaser.Game(config);
game.uiController = new UIController(game);
